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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutenticacionController = void 0;
const usuarios_1 = require("../models/usuarios");
class AutenticacionController {
    static Auth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { usuario_id, nombre, correo, avatar } = req.body;
            const resultado = yield usuarios_1.UsuariosModel.autenticarUsuario({
                usuario_id,
                nombre,
                correo,
                avatar
            });
            const statusCode = resultado.success ? 203 : 400;
            res.status(statusCode).json(resultado);
        });
    }
}
exports.AutenticacionController = AutenticacionController;
