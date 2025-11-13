import { Handler, stream } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface Message {
    role: 'user' | 'model';
    text: string;
}

// Duplicated enums from frontend/types.ts to avoid cross-dependency
enum WindowType {
    Sliding = 'Corredera', Casement = 'Abatible', Fixed = 'Fija',
    TiltAndTurn = 'Oscilobatiente', OsciloParalela = 'Osciloparalela',
}
enum Profile {
    VekaSoftline70 = 'Veka Softline 70', VekaSoftline82 = 'Veka Softline 82',
}
enum Material { PVC = 'PVC', Aluminum = 'Aluminio', Wood = 'Madera' }
enum GlassType {
    Triple = 'Triple', Double = 'Doble', Tempered = 'Templado', Laminated = 'Laminado',
}

const KNOWLEDGE_BASE = `
Resumen Técnico de Sistemas de Ventanas y Persianas Enrollables

1. Sistemas de Ventanas PVC (VEKA AG)
- Modelos Principales: VEKA 70mm AD (Softline, Topline, Schwingline) y Softline 70/82 AD+MD.
- Tipos de Construcción: Ventanas de 1 o 2 hojas, abatibles, oscilobatientes, fijas, etc.
- Material del Marco: PVC-U conforme a RAL-GZ 716.
- Características Técnicas:
  - Permeabilidad al Aire: Clase 4 (alta estanqueidad).
  - Resistencia al Viento: Hasta C5/B5 (alta resistencia).
  - Estanqueidad al Agua: Hasta 9A (protección contra lluvia intensa).
  - Aislamiento Acústico: Hasta 44 dB.
  - Resistencia al Robo: Hasta WK 2 (RC 2).
- Certificaciones: RAL System Passport y Certificado ift para "Vikonenko" GmbH válido hasta 22.09.2027.

2. Sistemas de Persianas Enrollables Adaptativas (Aluprof)
- Descripción: Para edificios existentes, sin alterar la estructura.
- Perfiles: Aluminio con espuma, extrudidos (PE) y PVC (PT).
- Accionamientos: Manuales y eléctricos (motores, mandos a distancia, control inteligente).
- Beneficios: Fácil instalación, aislamiento acústico y térmico superior (reduce costos de calefacción hasta 30%), protección solar y de seguridad. Sistema antimosquitos (Moskito) opcional.

3. Sistemas de Persianas Enrollables Superpuestas (Aluprof)
- Descripción: Se integran en la ventana durante la fabricación.
- Aislamiento Térmico: Coeficiente Usb de 0,59-0,66 W/(m²K).
- Estabilidad: Refuerzos de acero para persianas anchas.
- Beneficios: Ideal para proyectos complejos, alta rigidez, mejora estética y eficiencia energética.

Preguntas Frecuentes (FAQ)

- ¿Las ventanas se entregan montadas? Sí, completamente ensambladas y listas para su instalación en obra.
- ¿Qué necesito para descargar las ventanas? La entrega es a pie de camión. Para pedidos grandes o pesados, el cliente debe disponer de los medios mecánicos (grúa, etc.) y personal necesarios.
- ¿Qué incluye el pedido? La ventana completa (marco, hoja, cristal, herrajes). No incluye tornillería de fijación al muro ni materiales de sellado.
- ¿Cuál es el plazo de entrega? Unos 15 días laborables de fabricación tras la confirmación del pago, más el tiempo de transporte.
- ¿Puedo cancelar o modificar mi pedido? No es posible una vez que entra en producción (tras el pago), ya que se fabrica a medida.
`;

const SYSTEM_INSTRUCTION = `Eres un asistente virtual experto llamado 'Ventanas Perfectas AI Assistant'. Tu propósito es ayudar a los clientes con sus preguntas sobre ventanas, persianas y el proceso de pedido.
- Tu base de conocimiento es ESTRICTAMENTE la información proporcionada a continuación. NO inventes información que no esté aquí.
- Si no sabes la respuesta o la pregunta no está relacionada con el producto, responde amablemente que no tienes esa información.
- Sé amable, profesional y conciso.
- Responde siempre en español.

--- INICIO DE LA BASE DE CONOCIMIENTO ---
${KNOWLEDGE_BASE}
--- FIN DE LA BASE DE CONOCIMIENTO ---
`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: Object.values(WindowType) },
        width: { type: Type.INTEGER },
        height: { type: Type.INTEGER },
        material: { type: Type.STRING, enum: Object.values(Material) },
        profile: { type: Type.STRING, enum: Object.values(Profile) },
        glass: { type: Type.STRING, enum: Object.values(GlassType) },
        color: { type: Type.STRING },
        hasGrilles: { type: Type.BOOLEAN },
    },
};

const handler: Handler = stream(async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { type, payload } = JSON.parse(event.body || '{}');

        if (type === 'config') {
            const { prompt } = payload;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Analiza la siguiente descripción de una ventana y extrae sus características. Descripción: "${prompt}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    systemInstruction: "Eres un asistente experto en configuración de ventanas. Tu única tarea es extraer los parámetros de la descripción del usuario y devolverlos en formato JSON según el esquema proporcionado. No añadas explicaciones ni texto adicional."
                },
            });
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: response.text.trim(),
            };
        } else if (type === 'chat') {
            const { history } = payload as { history: Message[] };
            
            const contents = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            const streamSDK = await ai.models.generateContentStream({
                model: 'gemini-flash-latest',
                contents: contents,
                config: { systemInstruction: SYSTEM_INSTRUCTION },
            });

            for await (const chunk of streamSDK) {
                const chunkText = chunk.text;
                const formattedChunk = `data: ${JSON.stringify({ text: chunkText })}\n\n`;
                event.write(formattedChunk);
            }
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                }
            };

        } else {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request type' }) };
        }
    } catch (error: any) {
        console.error("Error in Netlify function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
        };
    }
});

export { handler };