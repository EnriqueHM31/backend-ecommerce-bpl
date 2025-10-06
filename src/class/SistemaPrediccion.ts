// src/services/recommendationEngine.ts
import * as tf from "@tensorflow/tfjs";

// src/services/recommendationEngine.ts

/**
 * Construye la matriz user-item para TensorFlow
 * @param compras Array de compras { usuario_id, producto_id }
 * @param productos Array de SKUs o nombres de productos
 * @param mapaIdToSku Mapa de producto_id (numérico) → sku (string)
 */
export function construirMatrizUserItem(
    compras: { usuario_id: string; producto_id: number }[],
    productos: string[],
    mapaIdToSku: Record<number, string>
) {
    // 1️⃣ Obtener todos los usuarios únicos
    const userIds = Array.from(new Set(compras.map((c) => c.usuario_id)));

    // 2️⃣ Generar matriz user-item binaria
    const matrix = userIds.map((userId) =>
        productos.map((sku) =>
            compras.some(
                (c) => c.usuario_id === userId && mapaIdToSku[c.producto_id] === sku
            )
                ? 1
                : 0
        )
    );

    // Debug opcional
    console.log("Usuarios:", userIds);
    console.log("Matriz user-item:", matrix);

    return { userIds, matrix };
}


/**
 * Calcula recomendaciones usando TensorFlow.js
 * Basado en co-ocurrencia + similitud coseno entre productos
 */
export function generarRecomendaciones(
    userItemMatrix: number[][],
    productos: string[],
    userIndex: number,
) {
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
