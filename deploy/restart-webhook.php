<?php
/**
 * Node.js App Restart Webhook
 * GitHub Actions deploy sonrası bu endpoint'i çağırarak uygulamayı restart eder.
 *
 * Kurulum: Bu dosyayı cPanel'de portal.uniqueanalyse.com dizinine yükleyin.
 * Kullanım: POST /restart-webhook.php?key=SECRET
 */

$SECRET = getenv('RESTART_SECRET') ?: '7286511857d74da1367dba0d847e843c158c855d';

// Sadece POST kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Secret kontrolü
$key = $_GET['key'] ?? $_POST['key'] ?? '';
if (!hash_equals($SECRET, $key)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

header('Content-Type: application/json');

$appRoot = dirname(__FILE__);
$tmpDir = $appRoot . '/tmp';
$restartFile = $tmpDir . '/restart.txt';

// tmp klasörünü oluştur
if (!is_dir($tmpDir)) {
    mkdir($tmpDir, 0755, true);
}

// restart.txt'yi güncelle — Passenger/LiteSpeed bunu izler
$timestamp = date('Y-m-d H:i:s');
$commitHash = $_POST['commit'] ?? 'unknown';
file_put_contents($restartFile, "restart-{$timestamp}-{$commitHash}\n");
touch($restartFile);

// Alternatif: cloudlinux-selector ile restart dene
$user = get_current_user();
$restartCmd = "cloudlinux-selector restart --json --interpreter nodejs --app-root /home/{$user}/portal.uniqueanalyse.com 2>&1";
$output = shell_exec($restartCmd);

echo json_encode([
    'success' => true,
    'timestamp' => $timestamp,
    'restart_file' => file_exists($restartFile),
    'cloudlinux_restart' => $output ? trim($output) : 'not available'
]);
