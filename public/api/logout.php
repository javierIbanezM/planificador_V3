<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;

Auth::logout();

header('Content-Type: application/json');
echo json_encode(['status' => 'success']);
