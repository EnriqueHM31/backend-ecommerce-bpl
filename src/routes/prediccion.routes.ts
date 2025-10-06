// src/routes/recommendations.routes.ts
import express from "express";
import { construirMatrizUserItem, generarRecomendaciones } from "../class/SistemaPrediccion";
import { supabase } from "../database/db";

const RouterPrediccion = express.Router();

/**
 * GET /recommendations/:userId
 * Genera recomendaciones basadas en historial de compras
 */
RouterPrediccion.get("/:userId", async (req, res) => {
    const { userId } = req.params;

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

        // 5️⃣ Si el usuario no tiene compras, devolver los 5 productos más vendidos
        const userCompras = compras.filter(c => c.usuario_id === userId);
        if (!userCompras.length) {
            // Contar cantidad de cada producto en pedidoItems
            const contadorProductos: Record<number, number> = {};
            pedidoItems.forEach(pi => {
                contadorProductos[pi.producto_id] = (contadorProductos[pi.producto_id] || 0) + 1;
            });

            // Ordenar y tomar los 5 más vendidos
            const top5Ids = Object.entries(contadorProductos)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([id]) => Number(id));

            // Mapear a SKUs
            const top5SKUs = top5Ids.map(id => mapaIdToSku[id]);

            res.json({
                userId,
                recomendaciones: top5SKUs,
                detalle: top5Ids.map(id => ({ producto_id: id, sku: mapaIdToSku[id] })),
                recomendado: false
            });
            return
        }

        // 6️⃣ Construir matriz user-item
        const { userIds, matrix } = construirMatrizUserItem(compras, productos, mapaIdToSku);

        // 7️⃣ Localizar índice del usuario actual
        const userIndex = userIds.indexOf(userId);
        if (userIndex === -1)
            res.json({ message: "Usuario sin historial de compras", recomendaciones: [], detalles: [], recomendado: false });

        // 8️⃣ Generar recomendaciones
        const recomendaciones = generarRecomendaciones(matrix, productos, userIndex);

        // 9️⃣ Devolver los SKUs recomendados
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
