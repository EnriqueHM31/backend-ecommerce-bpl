// src/routes/recommendations.routes.ts
import express from "express";
import { construirMatrizUserItem, generarRecomendaciones } from "../class/SistemaPrediccion";
import { supabase } from "../database/db";

const RouterPrediccion = express.Router();

/**
 * GET /recommendations?userId=...
 * Si no se proporciona userId, devuelve los 5 productos más vendidos
 */
RouterPrediccion.get("/recomendaciones/", async (req, res) => {
    const userId = req.query.userId as string | undefined;

    try {
        // 1️⃣ Obtener todos los pedidos de todos los usuarios
        const { data: pedidos, error: pedidosError } = await supabase
            .from("pedidos")
            .select("id, usuario_id");

        if (pedidosError) throw pedidosError;
        if (!pedidos || pedidos.length === 0)
            res.json({ message: "No hay pedidos en la base de datos", recomendaciones: [], detalles: [], recomendado: false });

        const pedidoIds = pedidos.map((p) => p.id);

        // 2️⃣ Obtener todos los productos de esos pedidos
        const { data: pedidoItems, error: pedidoItemsError } = await supabase
            .from("pedido_items")
            .select("producto_id, pedido_id");

        if (pedidoItemsError) throw pedidoItemsError;

        // Mapear todas las compras por usuario
        const compras = pedidoItems
            .filter((pi) => pedidoIds.includes(pi.pedido_id))
            .map((pi) => {
                const pedido = pedidos.find((p) => p.id === pi.pedido_id);
                return { usuario_id: pedido!.usuario_id, producto_id: pi.producto_id };
            });

        // 3️⃣ Obtener todos los productos (SKUs) y su ID
        const { data: productosData, error: productosError } = await supabase
            .from("productos_sku")
            .select("id, sku")
            .order("sku");

        if (productosError) throw productosError;
        if (!productosData || !productosData.length)
            res.json({ message: "No hay productos en la base de datos", recomendaciones: [], detalles: [], recomendado: false });

        // 4️⃣ Crear mapa producto_id → sku
        const mapaIdToSku: Record<number, string> = {};
        productosData.forEach((p) => {
            if (p.id != null && p.sku) mapaIdToSku[p.id] = p.sku;
        });

        const productos = productosData.map((p) => p.sku);

        // ✅ Función auxiliar: devolver top 5 productos más vendidos
        const topProductosMasVendidos = () => {
            const contadorProductos: Record<number, number> = {};
            pedidoItems.forEach(pi => {
                contadorProductos[pi.producto_id] = (contadorProductos[pi.producto_id] || 0) + 1;
            });
            const top5Ids = Object.entries(contadorProductos)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([id]) => Number(id));

            return {
                recomendaciones: top5Ids.map(id => mapaIdToSku[id]),
                detalle: top5Ids.map(id => ({ producto_id: id, sku: mapaIdToSku[id] })),
                recomendado: false
            };
        };

        // 5️⃣ Si no llega userId, devolver top 5 productos más vendidos
        if (!userId) {
            res.json({ userId: null, ...topProductosMasVendidos() });
            return;
        }

        // 6️⃣ Filtrar compras del usuario
        const userCompras = compras.filter(c => c.usuario_id === userId);
        if (!userCompras.length) {
            res.json({ userId, ...topProductosMasVendidos() });
        }

        // 7️⃣ Construir matriz user-item
        const { userIds, matrix } = construirMatrizUserItem(compras, productos, mapaIdToSku);

        // 8️⃣ Localizar índice del usuario actual
        const userIndex = userIds.indexOf(userId);
        if (userIndex === -1) {
            res.json({ userId, ...topProductosMasVendidos() });
        }

        // 9️⃣ Generar recomendaciones
        const recomendaciones = generarRecomendaciones(matrix, productos, userIndex);

        // 🔟 Devolver los SKUs recomendados
        const recommendedSKUs = recomendaciones.map((r) => r.producto);

        res.json({
            userId,
            recomendaciones: recommendedSKUs || [],
            detalle: recomendaciones,
            recomendado: true
        });

    } catch (err) {
        console.error("❌ Error generando recomendaciones:", err);
        res.status(500).json({ error: "Error generando recomendaciones", recomendaciones: [], detalles: [], recomendado: false });
    }
});

export default RouterPrediccion;
