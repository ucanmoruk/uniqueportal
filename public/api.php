<?php
/**
 * UNIQUE Services — Public Talep API
 * talep.uniqueanalyse.com/api.php
 *
 * Portaldan BAGIMSIZ. Direkt MySQL'e yazar (cPanel localhost).
 * Gereksinim: pdo_mysql (cPanel'de standart olarak vardir)
 */

// ── AYARLAR (BURAYI DOLDURUN) ────────────────────────────────────────
$DB_HOST   = 'localhost';                  // MySQL sunucu (cPanel: localhost)
$DB_PORT   = '3306';                       // Port
$DB_NAME   = 'uniqueanalyse_unipo';        // Veritabanı adı
$DB_USER   = 'BURAYA_KULLANICI';           // MySQL kullanıcı adı
$DB_PASS   = 'BURAYA_SIFRE';               // MySQL şifre

$ALLOWED_ORIGINS = [
    'https://talep.uniqueanalyse.com',
    'http://localhost:3000',
];

$RATE_LIMIT = 5;       // Dakikada max istek
$RATE_DIR   = __DIR__ . '/rate_tmp';

// ── CORS ─────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = in_array($origin, $ALLOWED_ORIGINS, true) ? $origin : $ALLOWED_ORIGINS[0];

header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Sadece POST istekleri kabul edilir.', 405);
}

// ── RATE LIMITING (dosya tabanlı) ────────────────────────────────────
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip = trim(explode(',', $ip)[0]);

if (!is_dir($RATE_DIR)) {
    @mkdir($RATE_DIR, 0700, true);
}

$rateFile = $RATE_DIR . '/' . md5($ip) . '.json';
$now = time();
$rateData = ['count' => 0, 'reset' => $now + 60];

if (file_exists($rateFile)) {
    $rateData = json_decode(file_get_contents($rateFile), true) ?: $rateData;
    if ($now > $rateData['reset']) {
        $rateData = ['count' => 0, 'reset' => $now + 60];
    }
}

$rateData['count']++;
file_put_contents($rateFile, json_encode($rateData), LOCK_EX);

if ($rateData['count'] > $RATE_LIMIT) {
    jsonError('Çok fazla talep gönderdiniz. Lütfen bir dakika bekleyin.', 429);
}

if (rand(1, 100) === 1) {
    foreach (glob($RATE_DIR . '/*.json') as $f) {
        if (filemtime($f) < $now - 120) @unlink($f);
    }
}

// ── BODY PARSE ───────────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || !is_array($body)) {
    jsonError('Geçersiz istek formatı.', 400);
}

// ── HONEYPOT ─────────────────────────────────────────────────────────
if (!empty($body['_hp'])) {
    echo json_encode(['success' => true, 'id' => 0]);
    exit;
}

// ── VALIDATION ───────────────────────────────────────────────────────
$errors = [];

$rap = $body['raporlama'] ?? [];
$fat = $body['fatura'] ?? [];
$num = $body['numuneler'] ?? [];

if (empty(trim($rap['Firma'] ?? ''))) {
    $errors[] = 'raporlama.Firma: Firma adı zorunlu.';
}
if (mb_strlen($rap['Firma'] ?? '', 'UTF-8') > 500) {
    $errors[] = 'raporlama.Firma: Maksimum 500 karakter.';
}

$allowedKarar = [
    'Belirsizlik dahil edilmesin',
    'Belirsizlik pozitif yönde dahil edilsin',
    'Belirsizlik negatif yönde dahil edilsin',
];
if (!empty($rap['Karar']) && !in_array($rap['Karar'], $allowedKarar, true)) {
    $errors[] = 'raporlama.Karar: Geçersiz değer.';
}

$allowedDil = ['Türkçe', 'İngilizce', 'Türkçe ve İngilizce'];
if (!empty($rap['Dil']) && !in_array($rap['Dil'], $allowedDil, true)) {
    $errors[] = 'raporlama.Dil: Geçersiz değer.';
}

$allowedIade = ['Evet', 'Hayır'];
if (!empty($rap['Iade']) && !in_array($rap['Iade'], $allowedIade, true)) {
    $errors[] = 'raporlama.Iade: Geçersiz değer.';
}

$rapMail = trim($rap['Mail'] ?? '');
if ($rapMail !== '' && !filter_var($rapMail, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'raporlama.Mail: Geçerli e-posta giriniz.';
}

$fatMail = trim($fat['Mail'] ?? '');
if ($fatMail !== '' && !filter_var($fatMail, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'fatura.Mail: Geçerli e-posta giriniz.';
}

if (!is_array($num) || count($num) === 0) {
    $errors[] = 'numuneler: En az bir numune ekleyin.';
}

if (!empty($errors)) {
    jsonError('Form hatalı. Lütfen alanları kontrol edin.', 400, $errors);
}

// ── DB BAĞLANTISI (MySQL / PDO) ──────────────────────────────────────
if (!extension_loaded('pdo_mysql')) {
    jsonError('Sunucuda MySQL sürücüsü (pdo_mysql) bulunamadı.', 500);
}

try {
    $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4";
    $conn = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_NUM,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $ex) {
    error_log("[public-talep] MySQL bağlantı hatası: " . $ex->getMessage());
    jsonError('Veritabanına bağlanılamadı.', 500);
}

// ── INSERT ───────────────────────────────────────────────────────────
try {
    $conn->beginTransaction();

    // Yeni TalepNo = son kaydın TalepNo + 1
    $stmt = $conn->query("SELECT TalepNo FROM Talep ORDER BY ID DESC LIMIT 1");
    $yeniNo = (int)($stmt->fetchColumn() ?: 0) + 1;

    // Benzersiz dış talep kodu üret
    $disKod = generateDisTalepKodu();
    for ($i = 0; $i < 5; $i++) {
        $chk = $conn->prepare("SELECT COUNT(*) FROM Talep WHERE DisTalepKodu = ?");
        $chk->execute([$disKod]);
        if ((int)$chk->fetchColumn() === 0) break;
        $disKod = generateDisTalepKodu();
    }

    // Ana talep
    $stmt = $conn->prepare(
        "INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, DisTalepKodu, Yetkili, Tur, Olusturan)
         VALUES (NOW(), 'YENI', 1, 'Yeni Talep', ?, ?, 0, 'Analiz', 0)"
    );
    $stmt->execute([$yeniNo, $disKod]);
    $talepId = (int)$conn->lastInsertId();

    // Raporlama bilgileri
    $cols = "TalepID, Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note";
    $vals = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
    $params = [
        $talepId,
        s($rap, 'Firma'), s($rap, 'Adres'), s($rap, 'Yetkili'),
        s($rap, 'Iletisim'), s($rap, 'Karar', 'Belirsizlik dahil edilmesin'),
        s($rap, 'Dil', 'Türkçe'), s($rap, 'Iade', 'Hayır'),
        s($rap, 'UreticiFirma'), s($rap, 'Note'),
    ];
    if ($rapMail !== '') { $cols .= ", Mail"; $vals .= ", ?"; $params[] = $rapMail; }
    $stmt = $conn->prepare("INSERT INTO TalepRaporlama ($cols) VALUES ($vals)");
    $stmt->execute($params);

    // Fatura bilgileri
    $stmt = $conn->prepare(
        "INSERT INTO TalepFatura (TalepID, Firma, Adres, VergiDairesi, VergiNo, Mail)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $talepId, s($fat, 'Firma'), s($fat, 'Adres'),
        s($fat, 'VergiDairesi'), s($fat, 'VergiNo'), s($fat, 'Mail'),
    ]);

    // Numuneler
    foreach ($num as $n) {
        $numune = trim($n['Numune'] ?? '');
        $analiz = trim($n['Analiz'] ?? '');
        if ($numune === '' && $analiz === '') continue;
        $stmt = $conn->prepare(
            "INSERT INTO TalepNumune (TalepID, Numune, Ozellik, Analiz, Metot)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $talepId, $n['Numune'] ?? '', $n['Ozellik'] ?? '',
            $n['Analiz'] ?? '', $n['Metot'] ?? '',
        ]);
    }

    $conn->commit();
    echo json_encode(['success' => true, 'id' => $talepId]);

} catch (Exception $ex) {
    try { $conn->rollBack(); } catch (Exception $ignore) {}
    error_log("[public-talep] INSERT hatası: " . $ex->getMessage());
    jsonError('Talep kaydedilemedi. Lütfen tekrar deneyin.', 500);
}

// ── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────
function s(array $arr, string $key, string $default = ''): string {
    return trim($arr[$key] ?? $default);
}

function generateDisTalepKodu(): string {
    $alfabe = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $yil = date('y');
    $kod = '';
    for ($i = 0; $i < 4; $i++) {
        $kod .= $alfabe[random_int(0, strlen($alfabe) - 1)];
    }
    return "ÜGAM/$yil/$kod";
}

function jsonError(string $message, int $status, array $details = []): void {
    http_response_code($status);
    $resp = ['error' => $message];
    if (!empty($details)) $resp['details'] = $details;
    echo json_encode($resp, JSON_UNESCAPED_UNICODE);
    exit;
}
