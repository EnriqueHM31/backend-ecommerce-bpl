
import nodemailer from 'nodemailer';
import { REMITENTE, PASS_GMAIL } from '../../config';

export const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // usa TLS
    auth: {
        user: REMITENTE,
        pass: PASS_GMAIL,
    },
    tls: {
        rejectUnauthorized: false, // evita errores de certificados en Render
    },
});
