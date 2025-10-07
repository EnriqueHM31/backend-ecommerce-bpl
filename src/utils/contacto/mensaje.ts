import { DESTINATARIO, REMITENTE } from "../../config";

interface ComentarioProps {
    nombre: string;
    correo: string;
    mensaje: string;
}

export const MensajeCorreo = ({ nombre, correo, mensaje }: ComentarioProps) => {
    return {
        from: REMITENTE,
        to: DESTINATARIO,
        subject: "Nuevo comentario de un cliente en StoreTecBPL",
        text: mensaje,
        html: `
      <div style="background-color: #0d1117; color: #ffffff; font-family: Arial, sans-serif; padding: 24px; border-radius: 10px; max-width: 600px; margin: auto;">
        <h1 style="font-size: 22px; margin-bottom: 20px; text-align: center; color: #4da6ff;">Nuevo comentario recibido</h1>
        <p><strong>Nombre del cliente:</strong> ${nombre}</p>
        <p><strong>Correo electrónico:</strong> <a href="mailto:${correo}" style="color: #4da6ff;">${correo}</a></p>
        <div style="background-color: #1c1f26; padding: 16px; border-left: 4px solid #4da6ff; border-radius: 8px; margin-top: 20px;">
          <p><strong>Comentario:</strong></p>
          <p>${mensaje}</p>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #888;">
          <p>Gracias por confiar en StoreTecBPL</p>
          <p>&copy; ${new Date().getFullYear()} StoreTecBPL. Todos los derechos reservados.</p>
        </div>
      </div>
    `,
    };
};
