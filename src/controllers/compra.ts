import { obtenerStripe } from "../constants/Stripe";
import { supabase } from "../database/db";
import { ModeloCompra } from "../models/compra";
import { CartItem } from "../types/producto";
//import { ModeloFactura } from "../utils/contacto/factura";
import { Request, Response } from "express";
import { getAllLineItems, getAllSessions } from "../utils/pagos/stripe";
import { CartItemsValidation } from "../utils/validaciones/cartItems";
import { UsuarioValidation } from "../utils/validaciones/usuario";
import { ModeloFactura } from "@/utils/contacto/factura";

interface Customer {
    id: string;
    name: string;
    email: string;
}

export class CompraController {

    static async RealizarCompra(req: Request, res: Response) {
        try {
            const { items, customer }: { items: CartItem[], customer: Customer } = req.body;

            // Validar items del carrito
            const resultadoValidarItems = CartItemsValidation.RevisarItems(items);
            if (!resultadoValidarItems.success) {
                res.status(400).json({
                    success: false,
                    message: 'Error en validación de items',
                    error: JSON.stringify(resultadoValidarItems.error)
                });
                return;
            }

            // Validar datos del cliente
            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({
                id: customer.id,
                nombre: customer.name,
                correo: customer.email
            });

            if (!resultadoValidarUsuario.success) {
                res.status(400).json({
                    success: false,
                    message: 'Error en validación de cliente',
                    error: JSON.stringify(resultadoValidarUsuario.error)
                });
                return;
            }

            console.log("ENTRO CREAR SESOOON");

            // Crear sesión de pago
            const { success, data, message } = await ModeloCompra.crearSesion(items, customer);

            if (!success) {
                res.status(400).json({
                    success: false,
                    message: message,
                    data: null
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: data,
                message: message
            });
        } catch (error) {
            console.error("Error creando sesión de Stripe:", error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor",
                error: "Error creando la sesión de pago"
            });
        }
    }


    static async ObtenerCompraPorSessionId(req: Request, res: Response) {
        const stripe = obtenerStripe();
        try {
            const { sessionId } = req.query;

            if (!sessionId) {
                res.status(400).json({ success: false, message: "No se proporcionó sessionId" });
            }

            // 1️⃣ Consultar la sesión en Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId as string);

            if (!session) {
                res.status(404).json({ success: false, message: "No se encontró la sesión de Stripe" });
                return
            }



            // 3️⃣ Buscar el pedido relacionado en tu base de datos
            const { data: pedidos, error: pedidosError } = await supabase
                .from("pedidos")
                .select("*")
                .eq("id", sessionId as string);

            if (pedidosError) {
                res.status(400).json({ success: false, error: pedidosError.message });
                return
            }

            if (!pedidos || pedidos.length === 0) {
                res.status(404).json({ success: false, message: "No se encontró el pedido" });
                return
            }

            const pedido = pedidos[0];

            // 4️⃣ Traer items del pedido
            const { data: items, error: itemsError } = await supabase
                .from("pedido_items")
                .select("*")
                .eq("pedido_id", sessionId as string);

            if (itemsError) {
                res.status(400).json({ success: false, error: itemsError.message });
                return
            }

            if (!items || items.length === 0) {
                res.status(404).json({ success: false, message: "No se encontraron items del pedido" });
                return
            }

            // 5️⃣ Traer productos relacionados
            const productoSkuIds = items.map(i => i.producto_id);
            const { data: productosSku, error: skuError } = await supabase
                .from("productos_sku")
                .select(`
              id,
              sku,
              stock,
              imagen_url,
              active,
              precio,
              productos_base(id,nombre,descripcion,marca,categorias(nombre))
            `)
                .in("id", productoSkuIds);

            if (skuError)
                res.status(400).json({ success: false, error: skuError.message });

            // 6️⃣ Traer dirección
            const { data: direcciones, error: direccionError } = await supabase
                .from("direcciones")
                .select("*")
                .eq("id_direccion", pedido.direccion_envio_id);

            if (direccionError) {

                res.status(400).json({ success: false, error: direccionError.message });
                return
            }

            const direccion = direcciones?.[0] ?? null;

            // 7️⃣ Traer usuario
            const { data: usuario, error: usuarioError } = await supabase
                .from("usuarios")
                .select("*")
                .eq("id_usuario", pedido.usuario_id);

            if (usuarioError) {
                res.status(400).json({ success: false, error: usuarioError.message });
                return
            }

            const usuarioDB = usuario?.[0] ?? null;

            // 8️⃣ Armar items con datos del producto
            const itemsConProductos = items.map(item => {
                const sku = productosSku?.find(p => p.id === item.producto_id);
                return {
                    ...item,
                    cantidad: item.cantidad ?? 1,
                    producto: sku
                };
            });

            // 2️⃣ Revisar si ya se envió la factura
            if (session.metadata?.enviada_factura !== "true") {
                // 9️⃣ Crear ReciboProps
                const reciboProps = {
                    nombre: usuarioDB?.nombre ?? "Cliente",
                    correo: usuarioDB?.correo ?? "Sin correo",
                    monto: pedido.total?.toString() ?? "0.00",
                    fecha: new Date(pedido.fecha_pedido + "Z").toLocaleString("es-MX", {
                        timeZone: "America/Mexico_City"
                    }),
                    direccion1: direccion?.calle ?? "",
                    direccion2: direccion?.colonia ?? "",
                    ciudad: direccion?.ciudad ?? "",
                    estado: direccion?.estado ?? "",
                    cp: direccion?.cp ?? "",
                    pais: direccion?.pais ?? "México",
                    items: itemsConProductos.map((item: any) => ({
                        producto: item.producto?.productos_base?.nombre ?? "Producto",
                        cantidad: item.cantidad ?? 1,
                        precio: item.producto?.precio?.toString() ?? "0.00",
                        total: ((item.cantidad ?? 1) * (item.producto?.precio ?? 0)).toFixed(2)
                    }))
                };

                // 🔟 Enviar factura
                await ModeloFactura.EnviarFacturaPDF(reciboProps);

                // 1️⃣1️⃣ Actualizar metadata en Stripe
                await stripe.checkout.sessions.update(sessionId as string, {
                    metadata: {
                        ...session.metadata,
                        enviada_factura: "true"
                    }
                });
            }

            const pedidoConItemsYDireccion = { ...pedido, fecha_pedido: new Date(pedido.fecha_pedido + 'Z').toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }), items: itemsConProductos, direccion, usuario: usuarioDB };



            // ✅ Responder
            res.status(200).json({
                success: true,
                message: "Factura enviada correctamente y marcada como enviada en Stripe.",
                data: pedidoConItemsYDireccion
            });

        } catch (err: any) {
            console.error(err);
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }
    static async ObtenerComprasPorEmail(req: Request, res: Response) {
        const stripe = obtenerStripe();

        try {
            const { email, id } = req.params;

            const { data: pedidos, error: pedidosError } = await supabase
                .from('pedidos')
                .select('id')
                .eq('usuario_id', id)

            if (pedidosError || !pedidos || pedidos.length === 0) {
                res.status(200).json({
                    success: false,
                    message: 'No se encontraron pedidos',
                    data: []
                });
                return;
            }

            // Buscar todos los clientes con ese email
            const customers = await stripe.customers.list({ email, limit: 100 });
            if (customers.data.length === 0) {
                res.json({
                    success: true,
                    data: [],
                    total: 0,
                    message: 'No se encontraron compras para este email'
                });
                return;
            }

            // Buscar todas las sesiones de todos los clientes encontrados
            let allSessions: any[] = [];
            for (const customer of customers.data) {
                const sessions = await getAllSessions(stripe, customer.id);
                allSessions.push(...sessions);
            }

            // Traer line_items de cada sesión
            const pedidosConItems = await Promise.all(
                allSessions.map(async (session) => {
                    const lineItems = await getAllLineItems(stripe, session.id);
                    return {
                        id: session.id,
                        amount_total: session.amount_total,
                        currency: session.currency,
                        status: session.payment_status,
                        created: session.created,
                        line_items: lineItems,
                        url: session.success_url,
                        customer: {
                            address: session.customer_details?.address,
                            email: session.customer_details?.email,
                            name: session.customer_details?.name,
                        },
                    };
                })
            );

            // Ordenar pedidos por fecha de creación
            pedidosConItems.sort((a, b) => b.created - a.created);

            res.json({
                success: true,
                data: pedidosConItems,
                total: pedidosConItems.length,
                message: 'Compras obtenidas correctamente'
            });
        } catch (error: any) {
            console.error("Error al obtener compras por email:", error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async ObtenerCompraDeUnUsuarioPorId(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // 1️⃣ Traer pedidos del usuario
            const { data: pedidos, error: pedidosError } = await supabase
                .from("pedidos")
                .select("*")
                .eq("usuario_id", id);

            if (pedidosError) res.status(400).json({ error: pedidosError.message });
            if (!pedidos || pedidos.length === 0) {
                res.status(200).json({ success: true, message: "No se encontraron pedidos", data: [] });
                return;
            }

            // 2️⃣ Traer items de todos los pedidos
            const pedidoIds = pedidos.map(p => p.id);
            const { data: items, error: itemsError } = await supabase
                .from("pedido_items")
                .select("*")
                .in("pedido_id", pedidoIds);

            if (itemsError) res.status(400).json({ error: itemsError.message });

            if (!items || items.length === 0) {
                res.status(404).json({ message: "No se encontraron items" });
                return;
            }

            // 3️⃣ Traer productos_sku relacionados
            const productoSkuIds = items.map(i => i.producto_id);
            const { data: productosSku, error: skuError } = await supabase
                .from("productos_sku")
                .select(`
              id,
              sku,
              stock,
              imagen_url,
              active,
              precio,
              productos_base(id,nombre,descripcion,marca,categorias(nombre)),
              variantes(id,nombre_variante,procesador,display,camara,bateria,conectividad,sistema_operativo),
              colores(nombre),
              almacenamientos(capacidad),
              especificaciones_ram(capacidad,tipo)
            `)
                .in("id", productoSkuIds);

            if (skuError) {
                res.status(400).json({ error: skuError.message });
                return;
            }
            // 4️⃣ Mapear productos en items
            const itemsConProductos = items.map(item => {
                const sku = productosSku.find(p => p.id === item.producto_id);
                return {
                    ...item,
                    cantidad: item.cantidad ?? 1,
                    producto: sku
                };
            });

            // 5️⃣ Traer todas las direcciones relacionadas con los pedidos
            const direccionIds = pedidos.map(p => p.direccion_envio_id);
            console.log({ direccionIds });
            const { data: direcciones, error: direccionError } = await supabase
                .from("direcciones") // ajusta el nombre de la tabla si es distinto
                .select("*")
                .in("id_direccion", direccionIds);

            if (direccionError) res.status(400).json({ error: direccionError.message });

            const usuariosIds = pedidos.map(p => p.usuario_id);
            const { data: usuarios, error: usuarioError } = await supabase
                .from("usuarios")
                .select("*")
                .in("id_usuario", usuariosIds);

            if (usuarioError) res.status(400).json({ error: usuarioError.message });


            // 6️⃣ Agrupar items y agregar dirección a cada pedido
            const pedidosConItemsYDireccion = pedidos.map(pedido => ({
                ...pedido,
                items: itemsConProductos.filter(item => item.pedido_id === pedido.id),
                direccion: direcciones?.find(d => d.id_direccion === pedido.direccion_envio_id) ?? null,
                usuario: usuarios?.find(u => u.id_usuario === pedido.usuario_id) ?? null
            }));

            const pedidosConHoraLocal = pedidosConItemsYDireccion?.map(pedido => ({
                ...pedido,
                fecha_pedido: new Date(pedido.fecha_pedido + 'Z').toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City'
                })
            }));

            res.status(200).json({ success: true, data: pedidosConHoraLocal });

        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }





}