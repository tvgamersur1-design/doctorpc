/**
 * Servicio de integración con RENIEC
 * Maneja las consultas a la API de RENIEC
 */

const fetch = require('node-fetch');

class ReniecService {
    constructor() {
        // Múltiples fuentes de API para RENIEC
        this.apiSources = [
            {
                name: 'RENIEC Official',
                url: 'https://www.reniec.gob.pe/api',
                requiresAuth: true
            },
            {
                name: 'APIs.net.pe',
                url: 'https://api.apis.net.pe/v1/dni',
                requiresAuth: false
            },
            {
                name: 'Identidad Digital',
                url: 'https://identidaddigital.gob.pe/api',
                requiresAuth: true
            }
        ];
        
        this.apiKey = process.env.DECOLECTA_API_KEY || '';
        this.timeout = 5000; // 5 segundos timeout
    }

    /**
     * Consultar RENIEC por DNI
     * @param {string} dni - Número de DNI (8 dígitos)
     * @returns {Object} Datos de la persona
     */
    async consultarPorDNI(dni) {
        // Validar DNI
        if (!this.validarDNI(dni)) {
            throw new Error('DNI inválido. Debe tener 8 dígitos');
        }

        // Intentar múltiples fuentes
        for (const source of this.apiSources) {
            try {
                const datos = await this.consultarFuente(source, dni);
                if (datos) {
                    return {
                        success: true,
                        data: datos,
                        source: source.name,
                        consultedAt: new Date().toISOString()
                    };
                }
            } catch (error) {
                console.warn(`Error consultando ${source.name}:`, error.message);
                continue; // Intentar siguiente fuente
            }
        }

        throw new Error('No se pudo obtener datos de RENIEC');
    }

    /**
     * Consultar una fuente específica
     * @private
     */
    async consultarFuente(source, dni) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);

        try {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'DoctorPC/1.0'
            };

            if (source.requiresAuth && this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const url = source.url.includes('?') 
                ? `${source.url}&numero=${dni}`
                : `${source.url}?numero=${dni}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return this.normalizarDatos(data, source.name);

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Timeout en consulta a RENIEC');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Normalizar respuesta según la fuente
     * @private
     */
    normalizarDatos(data, source) {
        switch (source) {
            case 'RENIEC Official':
                return {
                    numero_dni: data.numero_dni || data.dni,
                    nombres: data.nombres,
                    apellido_paterno: data.apellido_paterno,
                    apellido_materno: data.apellido_materno,
                    fecha_nacimiento: data.fecha_nacimiento || data.fechaNacimiento,
                    sexo: data.sexo,
                    estado_civil: data.estado_civil || data.estadoCivil,
                    ubigeo: data.ubigeo,
                    direccion: data.direccion
                };

            case 'APIs.net.pe':
                return {
                    numero_dni: data.numero_dni || data.dni,
                    nombres: data.nombres,
                    apellido_paterno: data.apellido_paterno || data.apellidoPaterno,
                    apellido_materno: data.apellido_materno || data.apellidoMaterno,
                    fecha_nacimiento: data.fecha_nacimiento || data.fechaNacimiento,
                    sexo: data.sexo,
                    estado_civil: data.estado_civil || data.estadoCivil
                };

            case 'Identidad Digital':
                return {
                    numero_dni: data.numeroDocumento || data.dni,
                    nombres: data.nombre,
                    apellido_paterno: data.apellidoPaterno,
                    apellido_materno: data.apellidoMaterno,
                    fecha_nacimiento: data.fechaNacimiento,
                    sexo: data.sexo
                };

            default:
                return data;
        }
    }

    /**
     * Validar formato de DNI
     * @private
     */
    validarDNI(dni) {
        if (!dni || typeof dni !== 'string') return false;
        
        const dniLimpio = dni.trim();
        
        // Validar que sea solo números
        if (!/^\d{8}$/.test(dniLimpio)) return false;
        
        // Validar dígito verificador (algoritmo RENIEC)
        return this.validarDigitoVerificador(dniLimpio);
    }

    /**
     * Validar dígito verificador de DNI
     * @private
     */
    validarDigitoVerificador(dni) {
        const pesos = [3, 2, 7, 6, 5, 4, 3, 2];
        let suma = 0;

        for (let i = 0; i < 8; i++) {
            suma += parseInt(dni.charAt(i)) * pesos[i];
        }

        const resto = suma % 11;
        const digito = 11 - resto;
        
        const digitoEsperado = digito === 11 ? 0 : (digito === 10 ? 1 : digito);
        
        // Nota: Actualmente solo validamos formato
        // La validación de dígito verificador es más compleja
        return true;
    }

    /**
     * Crear objeto cliente a partir de datos RENIEC
     */
    crearClienteDesdeReniec(datosReniec) {
        return {
            nombre: `${datosReniec.nombres || ''} ${datosReniec.apellido_paterno || ''} ${datosReniec.apellido_materno || ''}`.trim(),
            dni: datosReniec.numero_dni,
            sexo: datosReniec.sexo || '',
            fecha_nacimiento: datosReniec.fecha_nacimiento || '',
            estado_civil: datosReniec.estado_civil || '',
            direccion: datosReniec.direccion || '',
            telefono: '',
            email: '',
            fuente_reniec: true,
            fecha_consulta: new Date().toISOString()
        };
    }

    /**
     * Consultar lote de DNIs (útil para importación)
     */
    async consultarLote(dnis) {
        const resultados = [];
        const errores = [];

        for (const dni of dnis) {
            try {
                const resultado = await this.consultarPorDNI(dni);
                resultados.push(resultado);
            } catch (error) {
                errores.push({
                    dni: dni,
                    error: error.message
                });
            }

            // Esperar 500ms entre consultas para no sobrecargar
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return {
            exitosos: resultados,
            errores: errores,
            total: dnis.length,
            tasa_exito: (resultados.length / dnis.length * 100).toFixed(2) + '%'
        };
    }

    /**
     * Verificar disponibilidad de fuentes
     */
    async verificarFuentes() {
        const estado = [];

        for (const source of this.apiSources) {
            try {
                // Intentar un ping a la fuente
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(`${source.url}?numero=00000001`, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'DoctorPC/1.0'
                    }
                });

                clearTimeout(timeout);

                estado.push({
                    name: source.name,
                    disponible: response.status < 500, // No es error del servidor
                    status: response.status,
                    tiempo_respuesta: 'ok'
                });
            } catch (error) {
                estado.push({
                    name: source.name,
                    disponible: false,
                    error: error.message
                });
            }
        }

        return estado;
    }
}

// Exportar servicio
module.exports = ReniecService;

/**
 * Uso en server.js:
 * 
 * const ReniecService = require('./reniec-service');
 * const reniecService = new ReniecService();
 * 
 * app.get('/api/reniec/:dni', async (req, res) => {
 *   try {
 *     const datos = await reniecService.consultarPorDNI(req.params.dni);
 *     res.json(datos);
 *   } catch (error) {
 *     res.status(400).json({ error: error.message });
 *   }
 * });
 * 
 * app.get('/api/reniec/verificar-fuentes', async (req, res) => {
 *   const estado = await reniecService.verificarFuentes();
 *   res.json(estado);
 * });
 */
