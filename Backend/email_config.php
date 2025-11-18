<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

function sendVerificationEmail($email, $token) {
    $mail = new PHPMailer(true); 

    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'YOUR_GMAIL@gmail.com'; 
        $mail->Password = 'YOUR_APP_PASSWORD'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom('YOUR_GMAIL@gmail.com', 'Taskly App');
        $mail->addAddress($email);

        $mail->isHTML(true);
        $mail->Subject = 'Verify your Taskly account';
        $mail->Body = "Click the link below to verify:<br><br>
                       <a href='http://localhost/Backend/verify.php?token=$token'>Verify Now</a>";

        $mail->send();
        return true;
    } catch (Exception $e) {
        return false;
    }
}
