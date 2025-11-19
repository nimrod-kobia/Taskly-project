<?php
require __DIR__ . '/cors.php';

require __DIR__ . '/db.php';
require __DIR__ . '/config.php';
require __DIR__ . '/vendor/autoload.php';

header('Content-Type: application/json');

// === JWT Validation ===
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    }
}

$token = str_replace('Bearer ', '', $authHeader);

if (!$token) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No token provided']);
    exit;
}

$secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id ?? null;
    
    if (!$userId) {
        throw new Exception('Invalid token payload');
    }
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid token: ' . $e->getMessage()]);
    exit;
}

// === Get Notifications ===
try {
    if (isset($_GET['count']) && $_GET['count'] === 'true') {
        // Count tasks due this week (PostgreSQL syntax)
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE user_id = ? 
            AND (status IS NULL OR status != 'completed')
            AND due_date IS NOT NULL 
            AND due_date >= CURRENT_DATE 
            AND due_date <= CURRENT_DATE + INTERVAL '7 days'
        ");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'count' => (int)($result['count'] ?? 0)
        ]);
    } else {
        // Get tasks due this week (PostgreSQL syntax)
        $stmt = $pdo->prepare("
            SELECT 
                id,
                title,
                description,
                due_date,
                priority,
                status,
                CASE 
                    WHEN DATE(due_date) = CURRENT_DATE THEN 'due_today'
                    WHEN due_date < CURRENT_DATE THEN 'overdue'
                    ELSE 'upcoming'
                END as notification_type,
                DATE_PART('day', due_date::timestamp - CURRENT_DATE::timestamp) as days_until_due
            FROM tasks 
            WHERE user_id = ? 
            AND (status IS NULL OR status != 'completed')
            AND due_date IS NOT NULL 
            AND due_date >= CURRENT_DATE 
            AND due_date <= CURRENT_DATE + INTERVAL '7 days'
            ORDER BY due_date ASC
            LIMIT 20
        ");
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format messages
        foreach ($notifications as &$notification) {
            $days = (int)($notification['days_until_due'] ?? 0);
            
            if ($notification['notification_type'] === 'due_today') {
                $notification['message'] = "Due Today: " . $notification['title'];
            } elseif ($notification['notification_type'] === 'overdue') {
                $notification['message'] = "Overdue: " . $notification['title'];
            } else {
                $notification['message'] = "Due in {$days} day(s): " . $notification['title'];
            }
            
            $notification['type'] = $notification['notification_type'];
            $notification['created_at'] = $notification['due_date'];
            $notification['is_read'] = false;
        }
        
        echo json_encode([
            'success' => true,
            'notifications' => $notifications
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error',
        'details' => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}