<?php
// Test the login API endpoint

$url = 'http://localhost:8000/login.php';
$data = [
    'email' => 'test@example.com',
    'password' => 'test123'
];

echo "Testing Login API:\n";
echo "URL: $url\n";
echo "Email: {$data['email']}\n\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response:\n";
echo $response . "\n";

$decoded = json_decode($response, true);
if ($decoded) {
    echo "\nParsed Response:\n";
    print_r($decoded);
}
