"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/recommendations.routes.ts
const express_1 = __importDefault(require("express"));
const SistemaPrediccion_1 = require("../class/SistemaPrediccion");
const db_1 = require("../database/db");
const RouterPrediccion = express_1.default.Router();
/**
 * GET /recommendations/:userId
 * Genera recomendaciones basadas en historial de compras
 */
RouterPrediccion.get("/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        // 1️⃣ Obtener todos los pedidos de todos los usuarios
        const { data: pedidos, error: pedidosError } = yield db_1.supabase
            .from("pedidos")
            .select("id, usuario_id");
        if (pedidosError)
            throw pedidosError;
        if (!pedidos || pedidos.length === 0)
            res.json({ message: "No hay pedidos en la base de datos", recomendaciones: [], detalles: [], recomendado: false });
        const pedidoIds = pedidos.map((p) => p.id);
        // 2️⃣ Obtener todos los productos de esos pedidos
        const { data: pedidoItems, error: pedidoItemsError } = yield db_1.supabase
            .from("pedido_items")
            .select("producto_id, pedido_id");
        if (pedidoItemsError)
            throw pedidoItemsError;
        // Mapear todas las compras por usuario
        const compras = pedidoItems
            .filter((pi) => pedidoIds.includes(pi.pedido_id))
            .map((pi) => {
            const pedido = pedidos.find((p) => p.id === pi.pedido_id);
            return { usuario_id: pedido.usuario_id, producto_id: pi.producto_id };
        });
        // 3️⃣ Obtener todos los productos (SKUs) y su ID
        const { data: productosData, error: productosError } = yield db_1.supabase
            .from("productos_sku")
            .select("id, sku")
            .order("sku");
        if (productosError)
            throw productosError;
        if (!productosData || !productosData.length)
            res.json({ message: "No hay productos en la base de datos", recomendaciones: [], detalles: [], recomendado: false });
        // 4️⃣ Crear mapa producto_id → sku
        const mapaIdToSku = {};
        productosData.forEach((p) => {
            if (p.id != null && p.sku)
                mapaIdToSku[p.id] = p.sku;
        });
        const productos = productosData.map((p) => p.sku);
        // 5️⃣ Si el usuario no tiene compras, devolver los 5 productos más vendidos
        const userCompras = compras.filter(c => c.usuario_id === userId);
        if (!userCompras.length) {
            // Contar cantidad de cada producto en pedidoItems
            const contadorProductos = {};
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
            return;
        }
        // 6️⃣ Construir matriz user-item
        const { userIds, matrix } = (0, SistemaPrediccion_1.construirMatrizUserItem)(compras, productos, mapaIdToSku);
        // 7️⃣ Localizar índice del usuario actual
        const userIndex = userIds.indexOf(userId);
        if (userIndex === -1)
            res.json({ message: "Usuario sin historial de compras", recomendaciones: [], detalles: [], recomendado: false });
        // 8️⃣ Generar recomendaciones
        const recomendaciones = (0, SistemaPrediccion_1.generarRecomendaciones)(matrix, productos, userIndex);
        // 9️⃣ Devolver los SKUs recomendados
        const recommendedSKUs = recomendaciones.map((r) => r.producto);
        res.json({
            userId,
            recomendaciones: recommendedSKUs || [],
            detalle: recomendaciones,
            recomendado: true
        });
    }
    catch (err) {
        console.error("❌ Error generando recomendaciones:", err);
        res.status(500).json({ error: "Error generando recomendaciones", recomendaciones: [], detalles: [], recomendado: false });
    }
}));
exports.default = RouterPrediccion;
