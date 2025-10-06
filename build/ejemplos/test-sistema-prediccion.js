"use strict";
// src/ejemplos/test-sistema-prediccion.ts
// Ejemplo de uso del Sistema de Predicción
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.datosEjemplo = void 0;
exports.testarSistemaPrediccion = testarSistemaPrediccion;
const SistemaPrediccion_1 = require("../class/SistemaPrediccion");
// Datos de ejemplo para probar el sistema
const datosEjemplo = [
    // Usuario 1 - Fan de electrónicos
    { id_producto: 101, cantidad: 2, categoria: "electrónicos", usuario: "user_001" },
    { id_producto: 102, cantidad: 1, categoria: "electrónicos", usuario: "user_001" },
    { id_producto: 103, cantidad: 3, categoria: "electrónicos", usuario: "user_001" },
    { id_producto: 201, cantidad: 1, categoria: "hogar", usuario: "user_001" },
    // Usuario 2 - Similar al usuario 1
    { id_producto: 101, cantidad: 1, categoria: "electrónicos", usuario: "user_002" },
    { id_producto: 102, cantidad: 2, categoria: "electrónicos", usuario: "user_002" },
    { id_producto: 104, cantidad: 1, categoria: "electrónicos", usuario: "user_002" },
    { id_producto: 202, cantidad: 2, categoria: "hogar", usuario: "user_002" },
    // Usuario 3 - Fan de deportes
    { id_producto: 301, cantidad: 2, categoria: "deportes", usuario: "user_003" },
    { id_producto: 302, cantidad: 1, categoria: "deportes", usuario: "user_003" },
    { id_producto: 303, cantidad: 3, categoria: "deportes", usuario: "user_003" },
    { id_producto: 201, cantidad: 1, categoria: "hogar", usuario: "user_003" },
    // Usuario 4 - Similar al usuario 3
    { id_producto: 301, cantidad: 1, categoria: "deportes", usuario: "user_004" },
    { id_producto: 302, cantidad: 2, categoria: "deportes", usuario: "user_004" },
    { id_producto: 304, cantidad: 1, categoria: "deportes", usuario: "user_004" },
    { id_producto: 203, cantidad: 1, categoria: "hogar", usuario: "user_004" },
    // Usuario 5 - Usuario mixto
    { id_producto: 101, cantidad: 1, categoria: "electrónicos", usuario: "user_005" },
    { id_producto: 301, cantidad: 1, categoria: "deportes", usuario: "user_005" },
    { id_producto: 201, cantidad: 2, categoria: "hogar", usuario: "user_005" },
    { id_producto: 401, cantidad: 1, categoria: "libros", usuario: "user_005" },
    // Más usuarios para alcanzar el mínimo requerido
    { id_producto: 101, cantidad: 1, categoria: "electrónicos", usuario: "user_006" },
    { id_producto: 102, cantidad: 1, categoria: "electrónicos", usuario: "user_006" },
    { id_producto: 103, cantidad: 1, categoria: "electrónicos", usuario: "user_006" },
    { id_producto: 301, cantidad: 1, categoria: "deportes", usuario: "user_007" },
    { id_producto: 302, cantidad: 1, categoria: "deportes", usuario: "user_007" },
    { id_producto: 303, cantidad: 1, categoria: "deportes", usuario: "user_007" },
    { id_producto: 201, cantidad: 1, categoria: "hogar", usuario: "user_008" },
    { id_producto: 202, cantidad: 1, categoria: "hogar", usuario: "user_008" },
    { id_producto: 203, cantidad: 1, categoria: "hogar", usuario: "user_008" },
    { id_producto: 401, cantidad: 1, categoria: "libros", usuario: "user_009" },
    { id_producto: 402, cantidad: 1, categoria: "libros", usuario: "user_009" },
    { id_producto: 403, cantidad: 1, categoria: "libros", usuario: "user_009" },
    { id_producto: 501, cantidad: 1, categoria: "ropa", usuario: "user_010" },
    { id_producto: 502, cantidad: 1, categoria: "ropa", usuario: "user_010" },
    { id_producto: 503, cantidad: 1, categoria: "ropa", usuario: "user_010" },
];
exports.datosEjemplo = datosEjemplo;
function testarSistemaPrediccion() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Iniciando prueba del Sistema de Predicción...\n');
        // Crear instancia del sistema
        const sistema = new SistemaPrediccion_1.SistemaPrediccion();
        // Paso 1: Agregar datos de ejemplo
        console.log('📊 Agregando datos de ejemplo...');
        yield sistema.agregarHistorialCompras(datosEjemplo);
        // Paso 2: Verificar estadísticas
        console.log('\n📈 Estadísticas del modelo:');
        const estadisticas = sistema.obtenerEstadisticas();
        console.log(`- Total usuarios: ${estadisticas.totalUsuarios}`);
        console.log(`- Total productos: ${estadisticas.totalProductos}`);
        console.log(`- Total compras: ${estadisticas.totalCompras}`);
        console.log(`- Modelo listo: ${estadisticas.modeloListo ? '✅ Sí' : '❌ No'}`);
        // Paso 3: Mostrar productos populares
        console.log('\n🏆 Productos más vendidos:');
        const productosPopulares = sistema.obtenerProductosMasVendidos(5);
        productosPopulares.forEach((producto, index) => {
            console.log(`${index + 1}. Producto ${producto.id_producto} - ${producto.categoria} (${producto.totalVendido} vendidos)`);
        });
        // Paso 4: Generar recomendaciones para diferentes usuarios
        console.log('\n🎯 Generando recomendaciones...');
        const usuariosTest = ['user_001', 'user_003', 'user_005', 'user_nuevo'];
        for (const usuario of usuariosTest) {
            console.log(`\n--- Recomendaciones para ${usuario} ---`);
            try {
                const recomendaciones = yield sistema.generarRecomendaciones(usuario, 3);
                if (recomendaciones.length === 0) {
                    console.log('No hay recomendaciones disponibles');
                }
                else {
                    recomendaciones.forEach((rec, index) => {
                        console.log(`${index + 1}. Producto ${rec.id_producto} - ${rec.categoria}`);
                        console.log(`   Score: ${rec.score.toFixed(2)}, Confianza: ${rec.confianza.toFixed(2)}`);
                        console.log(`   Razón: ${rec.razon}`);
                    });
                }
            }
            catch (error) {
                console.log(`Error: ${error.message}`);
            }
        }
        // Paso 5: Probar guardar y cargar modelo
        console.log('\n💾 Probando persistencia del modelo...');
        try {
            yield sistema.guardarModelo('./modelo-test.json');
            console.log('✅ Modelo guardado exitosamente');
            // Crear nueva instancia y cargar modelo
            const sistemaNuevo = new SistemaPrediccion_1.SistemaPrediccion();
            yield sistemaNuevo.cargarModelo('./modelo-test.json');
            console.log('✅ Modelo cargado exitosamente');
            // Verificar que funciona igual
            const recomendacionesCargadas = yield sistemaNuevo.generarRecomendaciones('user_001', 2);
            console.log(`✅ Recomendaciones después de cargar: ${recomendacionesCargadas.length}`);
        }
        catch (error) {
            console.log(`❌ Error en persistencia: ${error.message}`);
        }
        console.log('\n🎉 Prueba completada exitosamente!');
    });
}
// Ejecutar prueba si se llama directamente
if (require.main === module) {
    testarSistemaPrediccion().catch(console.error);
}
