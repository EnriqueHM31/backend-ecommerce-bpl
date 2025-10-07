import { MensajeCorreo } from "../utils/contacto/mensaje";
import { DESTINATARIO, REMITENTE } from "../config";
import { transporter } from "../utils/contacto/contacto";

interface ComentarioResponseProps {
    nombre: string;
    correo: string;
    mensaje: string;
}


export class ModeloContacto {
    static async EnviarMensaje({ nombre, correo, mensaje }: ComentarioResponseProps) {
        try {
            const mailOptions = MensajeCorreo({ nombre, correo, mensaje });

            // Enviar correo al administrador (DESTINATARIO)
            const info = await transporter.sendMail({
                from: `${REMITENTE}`,        // Remitente
                to: DESTINATARIO ?? "",      // Destinatario
                subject: mailOptions.subject,
                html: mailOptions.html,
                text: mailOptions.text,
            });

            if (!info.accepted || info.accepted.length === 0) {
                throw new Error("Error al enviar el correo");
            }

            console.log("Correo enviado:", info);

            return {
                success: true,
                message: "Mensaje enviado correctamente",
                comentario: mailOptions,
            };
        } catch (error: any) {
            console.error("Error enviando mensaje:", error);
            return {
                success: false,
                message: error.message || "Error enviando el mensaje",
                comentario: {},
            };
        }
    }
}
