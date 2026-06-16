<?php
/**
 * UNIQUE Services — Public Talep API
 * talep.uniqueanalyse.com/api.php
 *
 * Portaldan BAGIMSIZ. Direkt MSSQL'e yazar.
 * Gereksinim: sqlsrv / pdo_sqlsrv / pdo_dblib (bu sunucuda VAR)
 */

// ── AYARLAR (BURAYI DOLDURUN) ────────────────────────────────────────
$DB_HOST   = 'mssql04.trwww.com';   // MSSQL sunucu adresi
$DB_PORT   = '1433';                 // Port
$DB_NAME   = 'massgrup_cosmo';       // Veritabanı adı
$DB_USER   = 'BURAYA_KULLANICI';     // Kullanıcı adı
$DB_PASS   = 'BURAYA_SIFRE';         // Şifre

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

// ── DB BAĞLANTISI ────────────────────────────────────────────────────
$conn = null;
$driver = '';

if (extension_loaded('sqlsrv')) {
    $driver = 'sqlsrv';
    $connInfo = [
        "Database"               => $DB_NAME,
        "UID"                    => $DB_USER,
        "PWD"                    => $DB_PASS,
        "CharacterSet"           => "UTF-8",
        "TrustServerCertificate" => true,
    ];
    $conn = sqlsrv_connect("$DB_HOST,$DB_PORT", $connInfo);
    if ($conn === false) {
        error_log("[public-talep] sqlsrv bağlantı hatası: " . json_encode(sqlsrv_errors()));
        jsonError('Veritabanına bağlanılamadı.', 500);
    }
} elseif (extension_loaded('pdo_sqlsrv')) {
    $driver = 'pdo_sqlsrv';
    try {
        $dsn = "sqlsrv:Server=$DB_HOST,$DB_PORT;Database=$DB_NAME;TrustServerCertificate=true";
        $conn = new PDO($dsn, $DB_USER, $DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $ex) {
        error_log("[public-talep] pdo_sqlsrv bağlantı hatası: " . $ex->getMessage());
        jsonError('Veritabanına bağlanılamadı.', 500);
    }
} elseif (extension_loaded('pdo_dblib')) {
    $driver = 'pdo_dblib';
    try {
        $dsn = "dblib:host=$DB_HOST:$DB_PORT;dbname=$DB_NAME;charset=UTF-8";
        $conn = new PDO($dsn, $DB_USER, $DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $ex) {
        error_log("[public-talep] pdo_dblib bağlantı hatası: " . $ex->getMessage());
        jsonError('Veritabanına bağlanılamadı.', 500);
    }
} else {
    jsonError('Sunucuda MSSQL sürücüsü bulunamadı.', 500);
}

// ── INSERT ───────────────────────────────────────────────────────────
try {
    // PDO tabanlı sürücüler
    if ($driver === 'pdo_sqlsrv' || $driver === 'pdo_dblib') {
        $conn->beginTransaction();

        $stmt = $conn->query("SELECT TOP 1 TalepNo FROM Talep ORDER BY ID DESC");
        $yeniNo = (int)($stmt->fetchColumn() ?: 0) + 1;

        $disKod = generateDisTalepKodu();
        for ($i = 0; $i < 5; $i++) {
            $chk = $conn->prepare("SELECT COUNT(*) FROM Talep WHERE DisTalepKodu = ?");
            $chk->execute([$disKod]);
            if ((int)$chk->fetchColumn() === 0) break;
            $disKod = generateDisTalepKodu();
        }

        $stmt = $conn->prepare(
            "INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, DisTalepKodu, Yetkili, Tur, Olusturan)
             OUTPUT INSERTED.ID
             VALUES (GETDATE(), 'YENI', 1, N'Yeni Talep', ?, ?, 0, N'Analiz', 0)"
        );
        $stmt->execute([$yeniNo, $disKod]);
        $talepId = (int)$stmt->fetchColumn();

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

        $stmt = $conn->prepare(
            "INSERT INTO TalepFatura (TalepID, Firma, Adres, VergiDairesi, VergiNo, Mail)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $talepId, s($fat, 'Firma'), s($fat, 'Adres'),
            s($fat, 'VergiDairesi'), s($fat, 'VergiNo'), s($fat, 'Mail'),
        ]);

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

    // sqlsrv sürücüsü
    } elseif ($driver === 'sqlsrv') {
        sqlsrv_begin_transaction($conn);

        $stmt = sqlsrv_query($conn, "SELECT TOP 1 TalepNo FROM Talep ORDER BY ID DESC");
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_NUMERIC);
        $yeniNo = (int)($row[0] ?? 0) + 1;
        sqlsrv_free_stmt($stmt);

        $disKod = generateDisTalepKodu();
        for ($i = 0; $i < 5; $i++) {
            $chk = sqlsrv_query($conn, "SELECT COUNT(*) FROM Talep WHERE DisTalepKodu = ?", [$disKod]);
            $r = sqlsrv_fetch_array($chk, SQLSRV_FETCH_NUMERIC);
            sqlsrv_free_stmt($chk);
            if ((int)($r[0] ?? 0) === 0) break;
            $disKod = generateDisTalepKodu();
        }

        $stmt = sqlsrv_query($conn,
            "INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, DisTalepKodu, Yetkili, Tur, Olusturan)
             OUTPUT INSERTED.ID
             VALUES (GETDATE(), 'YENI', 1, N'Yeni Talep', ?, ?, 0, N'Analiz', 0)",
            [$yeniNo, $disKod]
        );
        if ($stmt === false) throw new Exception(json_encode(sqlsrv_errors()));
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_NUMERIC);
        $talepId = (int)$row[0];
        sqlsrv_free_stmt($stmt);

        $rapParams = [
            $talepId, s($rap, 'Firma'), s($rap, 'Adres'), s($rap, 'Yetkili'),
            s($rap, 'Iletisim'), s($rap, 'Karar', 'Belirsizlik dahil edilmesin'),
            s($rap, 'Dil', 'Türkçe'), s($rap, 'Iade', 'Hayır'),
            s($rap, 'UreticiFirma'), s($rap, 'Note'),
        ];
        $rapCols = "TalepID, Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note";
        $rapVals = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
        if ($rapMail !== '') { $rapCols .= ", Mail"; $rapVals .= ", ?"; $rapParams[] = $rapMail; }
        $stmt = sqlsrv_query($conn, "INSERT INTO TalepRaporlama ($rapCols) VALUES ($rapVals)", $rapParams);
        if ($stmt === false) throw new Exception(json_encode(sqlsrv_errors()));
        sqlsrv_free_stmt($stmt);

        $stmt = sqlsrv_query($conn,
            "INSERT INTO TalepFatura (TalepID, Firma, Adres, VergiDairesi, VergiNo, Mail)
             VALUES (?, ?, ?, ?, ?, ?)",
            [$talepId, s($fat,'Firma'), s($fat,'Adres'), s($fat,'VergiDairesi'), s($fat,'VergiNo'), s($fat,'Mail')]
        );
        if ($stmt === false) throw new Exception(json_encode(sqlsrv_errors()));
        sqlsrv_free_stmt($stmt);

        foreach ($num as $n) {
            $numune = trim($n['Numune'] ?? '');
            $analiz = trim($n['Analiz'] ?? '');
            if ($numune === '' && $analiz === '') continue;
            $stmt = sqlsrv_query($conn,
                "INSERT INTO TalepNumune (TalepID, Numune, Ozellik, Analiz, Metot)
                 VALUES (?, ?, ?, ?, ?)",
                [$talepId, $n['Numune']??'', $n['Ozellik']??'', $n['Analiz']??'', $n['Metot']??'']
            );
            if ($stmt === false) throw new Exception(json_encode(sqlsrv_errors()));
            sqlsrv_free_stmt($stmt);
        }

        sqlsrv_commit($conn);
        echo json_encode(['success' => true, 'id' => $talepId]);
    }

} catch (Exception $ex) {
    if ($driver === 'pdo_sqlsrv' || $driver === 'pdo_dblib') {
        try { $conn->rollBack(); } catch (Exception $ignore) {}
    } elseif ($driver === 'sqlsrv') {
        sqlsrv_rollback($conn);
    }
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
