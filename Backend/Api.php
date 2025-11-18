<?php
// Backend/api.php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
$config = require __DIR__ . '/config.php';

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/TaskController.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php'; 

$authCtrl = new AuthController($pdo, $config['jwt']);
$taskCtrl = new TaskController($pdo, $config['jwt'], $config['mail']);
$authMw = new AuthMiddleware($pdo, $config['jwt']);

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['path']) ? $_GET['path'] : '/';

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

switch(true) {
    // auth
    case $path === 'auth/register' && $method === 'POST':
        $authCtrl->register($input);
        break;
    case $path === 'auth/login' && $method === 'POST':
        $authCtrl->login($input);
        break;

    // tasks - protected
    case $path === 'tasks/create' && $method === 'POST':
        $userId = $authMw->authenticate();
        $taskCtrl->createTask($userId, $input);
        break;
    case preg_match('#^tasks/([0-9]+)/update$#', $path, $m) && $method === 'PUT':
        $userId = $authMw->authenticate();
        $taskId = (int)$m[1];
        $taskCtrl->updateTask($userId, $taskId, $input);
        break;
    case preg_match('#^tasks/([0-9]+)/delete$#', $path, $m) && $method === 'DELETE':
        $userId = $authMw->authenticate();
        $taskId = (int)$m[1];
        $taskCtrl->deleteTask($userId, $taskId);
        break;
    case $path === 'tasks' && $method === 'GET':
        $userId = $authMw->authenticate();
        // optional filters from query string
        $filters = [];
        if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
        $taskCtrl->getTasks($userId, $filters);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error'=>'Not found']);
}
