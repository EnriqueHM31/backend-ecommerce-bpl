"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.construirMatrizUserItem = construirMatrizUserItem;
exports.generarRecomendaciones = generarRecomendaciones;
// src/services/recommendationEngine.ts
const tf = __importStar(require("@tensorflow/tfjs"));
// src/services/recommendationEngine.ts
/**
 * Construye la matriz user-item para TensorFlow
 * @param compras Array de compras { usuario_id, producto_id }
 * @param productos Array de SKUs o nombres de productos
 * @param mapaIdToSku Mapa de producto_id (numérico) → sku (string)
 */
function construirMatrizUserItem(compras, productos, mapaIdToSku) {
    // 1️⃣ Obtener todos los usuarios únicos
    const userIds = Array.from(new Set(compras.map((c) => c.usuario_id)));
    // 2️⃣ Generar matriz user-item binaria
    const matrix = userIds.map((userId) => productos.map((sku) => compras.some((c) => c.usuario_id === userId && mapaIdToSku[c.producto_id] === sku)
        ? 1
        : 0));
    // Debug opcional
    console.log("Usuarios:", userIds);
    console.log("Matriz user-item:", matrix);
    return { userIds, matrix };
}
/**
 * Calcula recomendaciones usando TensorFlow.js
 * Basado en co-ocurrencia + similitud coseno entre productos
 */
function generarRecomendaciones(userItemMatrix, productos, userIndex) {
    if (userItemMatrix.length === 0 || productos.length === 0)
        return [];
    // Convertir la matriz a tensor
    const userTensor = tf.tensor2d(userItemMatrix);
    // Co-ocurrencia: Aᵀ × A
    const itemItemMatrix = tf.matMul(userTensor.transpose(), userTensor);
    // Normalizar (similitud coseno)
    const norms = tf.sqrt(tf.sum(tf.square(itemItemMatrix), 1, true));
    const similarity = tf.divNoNan(itemItemMatrix, tf.matMul(norms, norms.transpose()));
    // Vector del usuario
    const userVector = userTensor.gather([userIndex]);
    // Puntajes: (userVector × similarity)
    const scores = tf.matMul(userVector, similarity).dataSync();
    // Productos comprados por el usuario
    const compras = userTensor.arraySync()[userIndex];
    // Generar lista ordenada
    const recomendaciones = productos
        .map((producto, i) => ({
        producto,
        score: scores[i],
        comprado: compras[i],
    }))
        .filter((r) => r.comprado === 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    // Liberar memoria TensorFlow
    tf.dispose([userTensor, itemItemMatrix, norms, similarity, userVector]);
    return recomendaciones;
}
