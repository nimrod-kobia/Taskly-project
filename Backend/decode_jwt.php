<?php
$token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyMywiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzYzNDk1NDI2LCJleHAiOjE3NjQxMDAyMjZ9.9jGlk144_G6MolqSTj9h39YNIaDlp9iYcE3CfYVeFLc';
$parts = explode('.', $token);
$payload = json_decode(base64_decode($parts[1]), true);
echo "JWT Payload:\n";
print_r($payload);
