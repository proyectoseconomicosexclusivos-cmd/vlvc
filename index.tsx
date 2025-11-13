// =================================================================================
// NOTA PARA EL DESARROLLADOR:
// Para solucionar el problema de la "página en blanco" en hostings estáticos
// que no tienen un proceso de compilación (bundler), todo el código de la
// aplicación (componentes, tipos, servicios, etc.) se ha consolidado en este
// único archivo.
//
// El navegador, con la ayuda de Babel, ahora solo necesita cargar y transpilar
// este archivo para que la aplicación funcione. Los demás archivos .tsx/.ts
// del proyecto ya no son utilizados por la aplicación en producción.
// =================================================================================

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// === INICIO: Contenido de types.ts ===

enum WindowType {
    Sliding = 'Corredera',
    Casement = 'Abatible',
    Fixed = 'Fija',
    TiltAndTurn = 'Oscilobatiente',
    OsciloParalela = 'Osciloparalela',
}

enum Profile {
    VekaSoftline70 = 'Veka Softline 70',
    VekaSoftline82 = 'Veka Softline 82',
}

enum Material {
    PVC = 'PVC',
    Aluminum = 'Aluminio',
    Wood = 'Madera',
}

enum GlassType {
    Triple = 'Triple',
    Double = 'Doble',
    Tempered = 'Templado',
    Laminated = 'Laminado',
}

interface WindowConfig {
    type: WindowType;
    width: number; // in cm
    height: number; // in cm
    material: Material;
    profile: Profile;
    glass: GlassType;
    color: string;
    hasGrilles: boolean;
}

interface CartItem {
    id: number;
    config: WindowConfig;
    price: number;
}

interface OrderDetails {
    orderNumber: string;
    orderDate: string;
    customerName: string;
    email: string;
    phone: string;
    deliveryAddress: string;
    items: CartItem[];
    totalCost: number;
    subtotal: number;
    vatAmount: number;
}

enum AppStep {
    Configure = 'Configuración',
    Checkout = 'Datos y Envío',
    Invoice = 'Factura y Pago',
    Confirmation = 'Confirmación',
}

enum AppView {
    Configurator,
    TechnicalInfo,
    FAQ,
}

type Message = {
    role: 'user' | 'model';
    text: string;
};

// === FIN: Contenido de types.ts ===


// === INICIO: Contenido de constants.ts ===

const VAT_RATE = 0.21;

const COLORS = [
    { name: 'Blanco', value: '#FFFFFF', textColor: 'text-black' },
    { name: 'Negro', value: '#2D3748', textColor: 'text-white' },
    { name: 'Gris Antracita', value: '#4A5568', textColor: 'text-white' },
    { name: 'Plata', value: '#E2E8F0', textColor: 'text-black' },
    { name: 'Imitación Madera', value: '#8B5A2B', textColor: 'text-white' },
];

const PRICING = {
    base: 90, 
    perSquareMeter: {
        [Material.PVC]: 240.81,
        [Material.Aluminum]: 288.97,
        [Material.Wood]: 402.15,
    },
    glassMultiplier: {
        [GlassType.Double]: 1.3,
        [GlassType.Triple]: 1.5,
        [GlassType.Tempered]: 1.6,
        [GlassType.Laminated]: 1.8,
    },
    typeMultiplier: {
        [WindowType.Fixed]: 0.8,
        [WindowType.Sliding]: 1.0,
        [WindowType.Casement]: 1.1,
        [WindowType.TiltAndTurn]: 1.4,
        [WindowType.OsciloParalela]: 1.6,
    },
    profileMultiplier: {
        [Profile.VekaSoftline70]: 1.0,
        [Profile.VekaSoftline82]: 1.25,
    },
    grilles: 135,
};

// === FIN: Contenido de constants.ts ===


// === INICIO: Contenido de services/geminiService.ts ===

const API_PROXY_URL = '/api/gemini-proxy';

const getWindowConfigFromText = async (prompt: string): Promise<Partial<WindowConfig>> => {
    try {
        const response = await fetch(API_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'config', payload: { prompt } }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la API');
        }

        const parsedConfig = await response.json();
        
        if (parsedConfig.color) {
            const colorMap: { [key: string]: string } = { 'blanco': 'Blanco', 'negro': 'Negro', 'gris': 'Gris Antracita', 'plata': 'Plata', 'madera': 'Imitación Madera' };
            const lowerCaseColor = parsedConfig.color.toLowerCase();
            for (const key in colorMap) {
                if (lowerCaseColor.includes(key)) {
                    parsedConfig.color = colorMap[key];
                    break;
                }
            }
        }
        
        return parsedConfig;

    } catch (error) {
        console.error("Error al llamar al proxy de la API:", error);
        throw new Error("No se pudo procesar la descripción. Inténtalo de nuevo.");
    }
};

const sendMessageToChatStream = async (history: Message[]): Promise<ReadableStream<Uint8Array>> => {
    const response = await fetch(API_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat', payload: { history } }),
    });

    if (!response.ok || !response.body) {
        const error = await response.json();
        throw new Error(error.error || 'Error al conectar con el chat de IA');
    }

    return response.body;
};

// === FIN: Contenido de services/geminiService.ts ===


// === INICIO: Contenido de components/icons/*.tsx ===

const WindowIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="12" y1="3" x2="12" y2="21"></line>
    </svg>
);
const AddToCartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        <line x1="12" y1="8" x2="12" y2="14"></line>
        <line x1="9" y1="11" x2="15" y2="11"></line>
    </svg>
);
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);
const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);
const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
const CheckoutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <polyline points="17 11 19 13 23 9"></polyline>
    </svg>
);
const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
const ConfigIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 20V10"></path>
        <path d="M18 20V4"></path>
        <path d="M6 20V16"></path>
    </svg>
);
const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);
const InvoiceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
);
const MagicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M12 2l4 4-1 4-4-2-4 2-1-4z"></path>
        <path d="M2 12h20"></path>
    </svg>
);
const QuestionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);
const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);
const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

// === FIN: Contenido de components/icons/*.tsx ===


// === INICIO: Contenido de components/*.tsx ===

const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-4 flex items-center">
                <WindowIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-800 ml-3">
                    Ventanas Perfectas
                </h1>
                <span className="ml-4 text-sm font-medium text-slate-500">Configurador de Pedidos</span>
            </div>
        </header>
    );
};

const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-slate-200 mt-12">
            <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} Ventanas Perfectas S.L. Todos los derechos reservados.</p>
                <p className="mt-1">Diseño y fabricación de ventanas a medida.</p>
            </div>
        </footer>
    );
};

const StepIndicator: React.FC<{ currentStep: AppStep }> = ({ currentStep }) => {
    const steps = Object.values(AppStep);
    const currentStepIndex = steps.indexOf(currentStep);

    const getIcon = (step: AppStep) => {
        switch(step) {
            case AppStep.Configure: return <ConfigIcon className="w-6 h-6"/>;
            case AppStep.Checkout: return <CheckoutIcon className="w-6 h-6"/>;
            case AppStep.Invoice: return <InvoiceIcon className="w-6 h-6"/>;
            case AppStep.Confirmation: return <CheckIcon className="w-6 h-6"/>;
        }
    }

    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} flex-1`}>
                        {stepIdx < currentStepIndex ? (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-blue-600" />
                                </div>
                                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700">
                                   <div className="text-white">{getIcon(step)}</div>
                                </div>
                            </>
                        ) : stepIdx === currentStepIndex ? (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-slate-200" />
                                </div>
                                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-600 bg-white" aria-current="step">
                                    <span className="text-blue-600">{getIcon(step)}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-slate-200" />
                                </div>
                                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
                                   <span className="text-slate-400">{getIcon(step)}</span>
                                </div>
                            </>
                        )}
                         <div className="absolute -bottom-7 text-center w-full">
                            <p className={`text-xs ${stepIdx <= currentStepIndex ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>{step}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

const DesignAssistant: React.FC<{ onConfigChange: (config: Partial<WindowConfig>) => void }> = ({ onConfigChange }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');

    const handleSubmit = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await getWindowConfigFromText(prompt);
            onConfigChange(result);
        } catch (err: any) {
            setError(err.message || 'Ha ocurrido un error.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isNetlify) {
        return (
            <div className="bg-slate-100 border-2 border-slate-200 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                    <MagicIcon className="w-6 h-6 text-slate-400 mr-2" />
                    <h3 className="text-lg font-semibold text-slate-600">Asistente de Diseño IA (No disponible)</h3>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                    Esta función avanzada requiere ser desplegada en Netlify para funcionar.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        placeholder="El asistente IA está desactivado en este hosting."
                        className="flex-grow p-2 border border-slate-300 rounded-md shadow-sm bg-slate-50"
                        disabled={true}
                    />
                    <button
                        disabled={true}
                        className="px-4 py-2 bg-slate-400 text-white font-semibold rounded-md shadow-sm cursor-not-allowed"
                    >
                        Configurar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
            <div className="flex items-center mb-2">
                <MagicIcon className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-800">Asistente de Diseño IA</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3">
                Describe la ventana que necesitas y la configuraremos por ti.
                <br/>
                Ej: "Una ventana abatible de PVC blanco, de 150cm de ancho y 120 de alto, con doble cristal."
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe tu ventana aquí..."
                    className="flex-grow p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </>
                    ) : 'Configurar'}
                </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
    );
};

const WindowPreview: React.FC<{ config: WindowConfig }> = ({ config }) => {
    const aspectRatio = config.width / config.height;
    const colorStyle = COLORS.find(c => c.name === config.color)?.value || '#FFFFFF';

    return (
        <div className="relative w-full h-64 bg-slate-200 rounded-lg flex items-center justify-center p-4 overflow-hidden">
            <div
                className="bg-sky-300/50 relative transition-all duration-300 ease-in-out border-8"
                style={{ 
                    width: `${Math.min(90, 90 * aspectRatio)}%`,
                    height: `${Math.min(90, 90 / aspectRatio)}%`,
                    borderColor: colorStyle,
                    boxShadow: `0 4px 15px rgba(0,0,0,0.2)`
                }}
            >
                {config.hasGrilles && (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0">
                        <div className="border-r-2 border-b-2" style={{ borderColor: colorStyle }}></div>
                        <div className="border-b-2" style={{ borderColor: colorStyle }}></div>
                        <div className="border-r-2" style={{ borderColor: colorStyle }}></div>
                        <div></div>
                    </div>
                )}
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-gray-400/50 rounded-sm"></div>
            </div>
        </div>
    );
};

const WindowConfigurator: React.FC<{ onAddToCart: (item: CartItem) => void }> = ({ onAddToCart }) => {
    const [config, setConfig] = useState<WindowConfig>({
        type: WindowType.Sliding,
        width: 120,
        height: 100,
        material: Material.PVC,
        profile: Profile.VekaSoftline70,
        glass: GlassType.Double,
        color: 'Blanco',
        hasGrilles: false,
    });

    const handleConfigChange = <K extends keyof WindowConfig>(key: K, value: WindowConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const updateConfig = (newConfig: Partial<WindowConfig>) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    }

    const price = useMemo(() => {
        const area = (config.width / 100) * (config.height / 100);
        let subtotal = PRICING.base;
        subtotal += area * (PRICING.perSquareMeter[config.material] || 0);
        subtotal *= PRICING.glassMultiplier[config.glass] || 1;
        subtotal *= PRICING.typeMultiplier[config.type] || 1;
        subtotal *= PRICING.profileMultiplier[config.profile] || 1;
        if (config.hasGrilles) {
            subtotal += PRICING.grilles;
        }
        const finalPrice = subtotal * (1 + VAT_RATE);
        return finalPrice;
    }, [config]);

    const handleAdd = () => {
        onAddToCart({ id: 0, config, price });
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Diseña tu Ventana</h2>
            <p className="text-slate-500 mb-6">Ajusta cada detalle y obtén una vista previa y precio al instante.</p>
            
            <DesignAssistant onConfigChange={updateConfig} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Controls */}
                <div className="space-y-6">
                    {/* Type, Material and Profile */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Ventana</label>
                            <select value={config.type} onChange={e => handleConfigChange('type', e.target.value as WindowType)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                {Object.values(WindowType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
                            <select value={config.material} onChange={e => handleConfigChange('material', e.target.value as Material)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                {Object.values(Material).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
                            <select value={config.profile} onChange={e => handleConfigChange('profile', e.target.value as Profile)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                {Object.values(Profile).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Dimensiones (cm)</label>
                        <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-slate-500">Ancho: {config.width}</span>
                            <input type="range" min="50" max="300" value={config.width} onChange={e => handleConfigChange('width', parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-slate-500">Alto: {config.height}</span>
                            <input type="range" min="50" max="250" value={config.height} onChange={e => handleConfigChange('height', parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>

                    {/* Glass */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cristal</label>
                        <select value={config.glass} onChange={e => handleConfigChange('glass', e.target.value as GlassType)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            {Object.values(GlassType).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button key={c.name} onClick={() => handleConfigChange('color', c.name)} className={`px-4 py-2 text-sm rounded-full border-2 transition-transform transform hover:scale-105 ${config.color === c.name ? 'border-blue-500 ring-2 ring-blue-500' : 'border-transparent'}`} style={{backgroundColor: c.value}}>
                                    <span className={c.textColor}>{c.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                     {/* Grilles */}
                    <div className="flex items-center">
                        <input id="grilles" type="checkbox" checked={config.hasGrilles} onChange={e => handleConfigChange('hasGrilles', e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                        <label htmlFor="grilles" className="ml-2 block text-sm text-slate-900">Añadir Cuarterones</label>
                    </div>
                </div>

                {/* Preview and Price */}
                <div className="flex flex-col justify-between">
                    <WindowPreview config={config} />
                    <div className="mt-6 text-center lg:text-right">
                        <p className="text-lg text-slate-600">Precio final (IVA incl.):</p>
                        <p className="text-4xl font-bold text-blue-600">{price.toFixed(2)} €</p>
                        <button onClick={handleAdd} className="mt-4 w-full lg:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <AddToCartIcon className="w-5 h-5 mr-2 -ml-1" />
                            Añadir al Pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OrderSummary: React.FC<{ cart: CartItem[]; onRemoveItem: (id: number) => void; onProceed: () => void; }> = ({ cart, onRemoveItem, onProceed }) => {
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    const CartItemCard: React.FC<{ item: CartItem; onRemove: (id: number) => void }> = ({ item, onRemove }) => (
        <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <p className="font-semibold text-slate-800">{item.config.type} de {item.config.material}</p>
                <p className="text-sm text-slate-500">
                    {item.config.width}cm x {item.config.height}cm | {item.config.profile} | {item.config.glass} | Color: {item.config.color} {item.config.hasGrilles ? '| Con cuarterones' : ''}
                </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <p className="font-bold text-lg text-blue-600 flex-grow sm:flex-grow-0">{item.price.toFixed(2)} €</p>
                <button onClick={() => onRemove(item.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="mt-10 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Resumen del Pedido</h2>
            {cart.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Aún no has añadido ninguna ventana a tu pedido.</p>
            ) : (
                <div className="space-y-4">
                    {cart.map(item => (
                        <CartItemCard key={item.id} item={item} onRemove={onRemoveItem} />
                    ))}
                    <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center">
                        <div className="text-xl font-bold text-slate-800">Total del Pedido (IVA incl.): <span className="text-blue-600">{total.toFixed(2)} €</span></div>
                        <button onClick={onProceed} className="mt-4 sm:mt-0 w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-md shadow-sm hover:bg-green-700 transition-colors">
                            Continuar con el Pedido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const CheckoutForm: React.FC<{ onPlaceOrder: (details: { customerName: string; email: string; phone: string; deliveryAddress: string }) => void; onBack: () => void; }> = ({ onPlaceOrder, onBack }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        email: '',
        phone: '',
        deliveryAddress: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.values(formData).some(val => String(val).trim() === '')) {
            alert('Por favor, rellena todos los campos.');
            return;
        }
        onPlaceOrder(formData);
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Información de Contacto y Envío</h2>
            <p className="text-slate-500 mb-6">Introduce tus datos para finalizar el pedido.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">Nombre Completo</label>
                    <input type="text" name="customerName" id="customerName" value={formData.customerName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Correo Electrónico</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Teléfono</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                </div>
                <div>
                    <label htmlFor="deliveryAddress" className="block text-sm font-medium text-slate-700">Dirección de Entrega Completa</label>
                    <textarea name="deliveryAddress" id="deliveryAddress" rows={3} value={formData.deliveryAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required></textarea>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-4 border-t border-slate-200">
                    <button type="button" onClick={onBack} className="px-6 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Volver
                    </button>
                    <button type="submit" className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Generar Factura y Realizar Pedido
                    </button>
                </div>
            </form>
        </div>
    );
};

const Invoice: React.FC<{ order: OrderDetails; onConfirmPayment: () => void; }> = ({ order, onConfirmPayment }) => {
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <div className="border-b border-slate-200 pb-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                         <div className="flex items-center mb-2">
                             <WindowIcon className="h-8 w-8 text-blue-600" />
                             <h1 className="text-2xl font-bold text-slate-800 ml-3">Ventanas Perfectas S.L.</h1>
                         </div>
                        <p className="text-slate-500 text-sm">C/ de la Innovación, 123, 28080 Madrid</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold text-blue-600">FACTURA</h2>
                        <p className="text-slate-600">Nº: {order.orderNumber}</p>
                        <p className="text-slate-600">Fecha: {order.orderDate}</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Facturar a:</h3>
                    <p className="font-bold">{order.customerName}</p>
                    <p>{order.deliveryAddress}</p>
                    <p>{order.email}</p>
                    <p>{order.phone}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                     <h3 className="font-semibold text-slate-700 mb-2">Instrucciones de Pago:</h3>
                     <p className="text-sm text-slate-600">Para confirmar tu pedido, por favor realiza una transferencia bancaria por el importe total a la siguiente cuenta:</p>
                     <div className="mt-3 space-y-1 text-sm font-mono bg-white p-3 rounded">
                        <p><span className="font-semibold">Titular:</span> Ventanas Perfectas S.L.</p>
                        <p><span className="font-semibold">IBAN:</span> ES00 1234 5678 9012 3456 7890</p>
                        <p><span className="font-semibold">Banco:</span> Banco Ficticio S.A.</p>
                        <p><span className="font-semibold">Concepto:</span> Pedido {order.orderNumber}</p>
                     </div>
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-slate-700 mb-3">Detalles del Pedido:</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 text-sm text-slate-600">
                            <tr>
                                <th className="p-3 font-medium">Descripción</th>
                                <th className="p-3 font-medium text-right">Precio (IVA incl.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map(item => (
                                <tr key={item.id} className="border-b border-slate-100">
                                    <td className="p-3">
                                        <p className="font-semibold text-slate-800">{item.config.type} de {item.config.material}</p>
                                        <p className="text-sm text-slate-500">{item.config.width}cm x {item.config.height}cm | {item.config.profile} | {item.config.glass} | {item.config.color}</p>
                                    </td>
                                    <td className="p-3 text-right font-medium">{item.price.toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-semibold">
                            <tr>
                                <td className="p-3 pt-4 text-right">Subtotal:</td>
                                <td className="p-3 pt-4 text-right">{order.subtotal.toFixed(2)} €</td>
                            </tr>
                             <tr>
                                <td className="p-3 text-right">IVA (21%):</td>
                                <td className="p-3 text-right">{order.vatAmount.toFixed(2)} €</td>
                            </tr>
                            <tr className="text-lg">
                                <td className="p-3 text-right border-t-2 border-slate-200">Total:</td>
                                <td className="p-3 text-right text-blue-600 border-t-2 border-slate-200">{order.totalCost.toFixed(2)} €</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <p className="text-slate-600 mb-4">Una vez realizada la transferencia, sube el comprobante para que podamos empezar a fabricar tus ventanas.</p>
                <button onClick={onConfirmPayment} className="px-8 py-3 bg-green-600 text-white font-bold rounded-md shadow-sm hover:bg-green-700 transition-colors">
                    He realizado el pago, subir comprobante
                </button>
            </div>
        </div>
    );
};

const PaymentConfirmation: React.FC<{ orderNumber: string; onNewOrder: () => void; }> = ({ orderNumber, onNewOrder }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!file) return;
        setIsUploading(true);
        setTimeout(() => {
            setIsUploading(false);
            setIsUploaded(true);
        }, 2000);
    };

    if (isUploaded) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                 <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Pedido Confirmado!</h2>
                <p className="text-slate-600 mb-4">Hemos recibido tu comprobante para el pedido <span className="font-bold">{orderNumber}</span>. ¡Nos ponemos manos a la obra!</p>
                <p className="text-sm text-slate-500 mb-6">En breve recibirás un email de confirmación final. El plazo de fabricación estimado es de 15 días laborables.</p>
                <button onClick={onNewOrder} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
                    Realizar un Nuevo Pedido
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Confirmar Pago</h2>
            <p className="text-slate-500 mb-6">Sube el comprobante de la transferencia para el pedido <span className="font-bold">{orderNumber}</span>.</p>
            
            <div 
                className={`relative block w-full border-2 ${file ? 'border-blue-400' : 'border-slate-300'} border-dashed rounded-lg p-12 text-center hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer`}
                onClick={() => fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                <span className="mt-2 block text-sm font-medium text-slate-900">
                    {file ? `Archivo seleccionado: ${file.name}` : 'Haz clic para seleccionar un archivo'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                    PNG, JPG, PDF hasta 10MB
                </span>
            </div>

            {file && (
                 <div className="mt-6 text-center">
                     <button 
                        onClick={handleUpload} 
                        disabled={isUploading}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400">
                         {isUploading ? (
                             <>
                                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Subiendo...
                             </>
                         ) : 'Enviar Comprobante'}
                     </button>
                 </div>
            )}
        </div>
    );
};

const TechnicalInfo: React.FC = () => {
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-4 border-b pb-4">Resumen Técnico de Sistemas</h1>

            <div className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold mt-6">1. Sistemas de Ventanas PVC (VEKA AG)</h2>
                
                <h3 className="font-semibold">Modelos Principales:</h3>
                <ul>
                    <li><strong>VEKA 70mm AD (Softline, Topline, Schwingline)</strong> – Profundidad de marco de 70 mm con sellado de impacto.</li>
                    <li><strong>Softline 70 y Softline 82 AD+MD</strong> – Certificados para ventanas y puertas exteriores peatonales.</li>
                </ul>

                <h3 className="font-semibold">Tipos de Construcción:</h3>
                <ul>
                    <li><strong>Tipo 1.1:</strong> Ventanas abatibles, oscilobatientes, basculantes, puertas y fijos (individuales o dobles con parteluz fijo).</li>
                    <li><strong>Tipo 1.2:</strong> Ventanas y puertas dobles con parteluz dummy (simulado) o abatible.</li>
                </ul>
                <p><strong>Material del Marco:</strong> PVC-U conforme a RAL-GZ 716 (Sección I, Parte 1/4).</p>

                <h3 className="font-semibold">Características Técnicas y Rendimiento (según EN 14351-1 y RAL-GZ 716):</h3>
                <div className="overflow-x-auto">
                    <table className="w-full my-4">
                        <thead className="bg-slate-50">
                            <tr><th className="px-4 py-2 text-left font-semibold">Característica</th><th className="px-4 py-2 text-left font-semibold">Valor</th></tr>
                        </thead>
                        <tbody>
                            <tr className="border-t">
                                <td className="px-4 py-2">Fuerzas de Operación</td><td className="px-4 py-2">Clase 1 (fácil manejo).</td>
                            </tr>
                            <tr className="border-t">
                                <td className="px-4 py-2">Permeabilidad al Aire</td><td className="px-4 py-2">Clase 4 (alta estanqueidad).</td>
                            </tr>
                            <tr className="border-t">
                                <td className="px-4 py-2">Resistencia al Viento</td><td className="px-4 py-2">Hasta C5/B5 (alta resistencia).</td>
                            </tr>
                            <tr className="border-t">
                                <td className="px-4 py-2">Estanqueidad al Agua</td><td className="px-4 py-2">Hasta 9A (protección contra lluvia intensa).</td>
                            </tr>
                            <tr className="border-t">
                                <td className="px-4 py-2">Aislamiento Acústico</td><td className="px-4 py-2">Hasta Rw (C;Ctr) 44 (-2;-6) dB.</td>
                            </tr>
                             <tr className="border-t">
                                <td className="px-4 py-2">Resistencia al Robo</td><td className="px-4 py-2">Hasta WK 2 (RC 2).</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="font-semibold">Certificaciones:</h3>
                <ul>
                    <li>RAL System Passport No. 14-000396-PR05.</li>
                    <li>Certificado ift No. 189-9016021-1-1 para fabricante "Vikonenko" GmbH (Ucrania), válido hasta 22.09.2027.</li>
                    <li>Control de producción en fábrica (FPC) con inspecciones por ift-Zert.</li>
                </ul>

                 <h3 className="font-semibold">Beneficios:</h3>
                <ul>
                    <li>Alta eficiencia energética (reduce pérdidas térmicas).</li>
                    <li>Durabilidad y resistencia a la intemperie.</li>
                    <li>Cumple con Reglamento de Productos de Construcción (CPR) para Declaración de Prestaciones.</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8">2. Sistemas de Persianas Enrollables Adaptativas (Aluprof)</h2>
                <p>Sistemas adaptativos para edificios existentes, sin alterar la estructura. Fabricados en chapa de alta calidad, resistentes a abrasión y condiciones climáticas.</p>
                <h3 className="font-semibold">Perfiles Disponibles:</h3>
                <ul>
                    <li>Aluminio con Espuma de Poliuretano.</li>
                    <li>Extrudidos (PE) para mayor resistencia.</li>
                    <li>PVC (PT) para opciones económicas.</li>
                </ul>
                 <h3 className="font-semibold">Accionamientos:</h3>
                <p>Manuales (manivelas, cintas) y eléctricos (motores, mandos a distancia, control inteligente).</p>
                 <h3 className="font-semibold">Beneficios:</h3>
                 <ul>
                    <li>Fácil instalación no invasiva.</li>
                    <li>Aislamiento acústico y térmico superior (reduce costos de calefacción hasta un 30%).</li>
                    <li>Protección contra sol, ruido, insectos (sistema Moskito) y robos.</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8">3. Sistemas de Persianas Enrollables Superpuestas (Aluprof)</h2>
                 <p>Sistemas superpuestos para integración en ventanas durante la fabricación, ofreciendo un aislamiento térmico mejorado.</p>
                <h3 className="font-semibold">Características:</h3>
                <ul>
                    <li><strong>Aislamiento Térmico:</strong> Coeficiente Usb de 0,59-0,66 W/(m²K) (probado por IFT Rosenheim).</li>
                    <li><strong>Estabilidad:</strong> Refuerzos de acero para persianas anchas.</li>
                    <li><strong>Instalación:</strong> Versátil (sin empotrar, parcial o totalmente integrada).</li>
                </ul>
                 <h3 className="font-semibold">Beneficios:</h3>
                 <ul>
                    <li>Ideal para proyectos complejos por su alta rigidez.</li>
                    <li>Mejora estética y eficiencia energética.</li>
                </ul>
            </div>
        </div>
    );
};

const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const faqs = [
        { question: '¿Las ventanas se entregan montadas?', answer: 'Sí, nuestras ventanas se entregan completamente ensambladas, con el cristal instalado y los herrajes montados, listas para su instalación en obra. Esto simplifica enormemente el proceso de montaje final.' },
        { question: '¿Qué necesito para descargar las ventanas en la obra?', answer: 'La entrega se realiza a pie de camión. Para pedidos pequeños o ventanas de tamaño manejable, dos personas suelen ser suficientes. Para ventanas de gran formato, pedidos voluminosos o si la obra está en un piso elevado, es responsabilidad del cliente disponer de los medios mecánicos necesarios (elevador, grúa, etc.) y del personal adecuado para la descarga y manipulación segura del material.' },
        { question: '¿Qué incluye el pedido exactamente?', answer: 'Cada ventana incluye el marco, la hoja(s) con el acristalamiento seleccionado y todos los herrajes de apertura y cierre ya instalados. El pedido no incluye la tornillería de fijación al muro, las espumas expansivas, ni los selladores perimetrales, ya que estos elementos deben ser seleccionados por el instalador en función del tipo de pared y las características de la obra.' },
        { question: '¿Cuál es el plazo de entrega estimado?', answer: 'Una vez que recibimos la confirmación del pago (mediante el envío del comprobante), el pedido entra en producción. El plazo de fabricación estimado es de 15 días laborables. A esto hay que sumarle el tiempo de transporte, que varía según la dirección de entrega final.' },
        { question: '¿Puedo cancelar o modificar mi pedido?', answer: 'Dado que cada ventana se fabrica a medida según las especificaciones únicas de cada cliente, no es posible realizar modificaciones ni cancelaciones una vez que el pedido ha entrado en la línea de producción (tras la confirmación del pago). Le recomendamos encarecidamente que revise todos los detalles en la factura proforma antes de proceder con el pago.' }
    ];

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const FaqItem: React.FC<{ faq: { question: string, answer: string }, isOpen: boolean, onClick: () => void }> = ({ faq, isOpen, onClick }) => (
        <div className="border-b border-slate-200 py-4">
            <h2>
                <button onClick={onClick} className="flex justify-between items-center w-full text-left font-semibold text-slate-800" aria-expanded={isOpen}>
                    <span>{faq.question}</span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
                </button>
            </h2>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <p className="pt-2 text-slate-600">{faq.answer}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 border-b pb-4">Preguntas Frecuentes</h1>
            <div className="space-y-2">
                {faqs.map((faq, index) => (
                    <FaqItem key={index} faq={faq} isOpen={openIndex === index} onClick={() => handleToggle(index)} />
                ))}
            </div>
        </div>
    );
};

const ChatBubble: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 bg-blue-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-50"
            aria-label="Abrir chat de ayuda"
        >
            <ChatIcon className="w-8 h-8" />
        </button>
    );
};

const AIChatWindow: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte con tu pedido de ventanas?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || !input.trim()) return;

        const userMessage: Message = { role: 'user', text: input };
        const historyForAPI = [...messages, userMessage];

        setMessages(historyForAPI);
        setInput('');
        setIsLoading(true);

        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        try {
            const stream = await sendMessageToChatStream(historyForAPI);
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const decodedChunk = decoder.decode(value, { stream: true });
                
                const lines = decodedChunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr) {
                             try {
                                const chunkData = JSON.parse(jsonStr);
                                if (chunkData.text) {
                                    setMessages(prev => {
                                        const lastMsgIndex = prev.length - 1;
                                        const newMessages = [...prev];
                                        if (lastMsgIndex >= 0 && newMessages[lastMsgIndex].role === 'model') {
                                            newMessages[lastMsgIndex].text += chunkData.text;
                                        }
                                        return newMessages;
                                    });
                                }
                            } catch (e) {
                                console.error("Error parsing JSON from stream:", e);
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Error en el chat:", error);
            setMessages(prev => {
                const lastMsgIndex = prev.length - 1;
                const updatedMessages = [...prev];
                if(lastMsgIndex >= 0 && updatedMessages[lastMsgIndex].role === 'model') {
                     updatedMessages[lastMsgIndex].text = 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo más tarde.';
                }
                return updatedMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-full max-h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 transform transition-all duration-300 ease-out origin-bottom-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-slate-50 rounded-t-xl">
                 <div className="flex items-center">
                    <WindowIcon className="h-6 w-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-800 ml-2">Asistente IA</h3>
                </div>
                <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto bg-slate-100/50">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-xs px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}{msg.role === 'model' && isLoading && index === messages.length - 1 ? '...' : ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta..."
                        className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400">
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};

const navItems = [
    { view: AppView.Configurator, label: 'Configurador', icon: <ConfigIcon className="w-5 h-5"/> },
    { view: AppView.TechnicalInfo, label: 'Información Técnica', icon: <InfoIcon className="w-5 h-5"/> },
    { view: AppView.FAQ, label: 'Preguntas Frecuentes', icon: <QuestionIcon className="w-5 h-5"/> },
];

const Navigation: React.FC<{ currentView: AppView; setView: (view: AppView) => void; }> = ({ currentView, setView }) => {
    return (
        <nav className="bg-white shadow-sm sticky top-0 z-40">
            <div className="container mx-auto px-4">
                <div className="flex justify-center items-center -mb-px">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setView(item.view)}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ease-in-out
                                ${
                                    currentView === item.view
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }
                            `}
                        >
                            {item.icon}
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
};

// === FIN: Contenido de components/*.tsx ===


// === INICIO: Componente Principal App ===

const App: React.FC = () => {
    const [view, setView] = useState<AppView>(AppView.Configurator);
    const [step, setStep] = useState<AppStep>(AppStep.Configure);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');

    const totalCost = useMemo(() => {
        return cart.reduce((total, item) => total + item.price, 0);
    }, [cart]);

    const handleAddToCart = (item: CartItem) => {
        setCart(prevCart => [...prevCart, { ...item, id: Date.now() + Math.random() }]);
    };
    
    const handleRemoveFromCart = (id: number) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    const handleProceedToCheckout = () => {
        if (cart.length > 0) {
            setStep(AppStep.Checkout);
        } else {
            alert('Añade al menos una ventana a tu pedido para continuar.');
        }
    };
    
    const handlePlaceOrder = (details: Omit<OrderDetails, 'items' | 'totalCost' | 'orderNumber' | 'orderDate' | 'subtotal' | 'vatAmount'>) => {
        const subtotal = totalCost / (1 + VAT_RATE);
        const vatAmount = totalCost - subtotal;
        
        const finalOrder: OrderDetails = {
            ...details,
            items: cart,
            totalCost: totalCost,
            subtotal: subtotal,
            vatAmount: vatAmount,
            orderNumber: `VP-${Math.floor(1000 + Math.random() * 9000)}`,
            orderDate: new Date().toLocaleDateString('es-ES'),
        };
        setOrderDetails(finalOrder);
        setStep(AppStep.Invoice);
    };

    const handleConfirmPayment = () => {
        setStep(AppStep.Confirmation);
    };
    
    const handleStartNewOrder = () => {
        setCart([]);
        setOrderDetails(null);
        setStep(AppStep.Configure);
        setView(AppView.Configurator);
    };

    const renderStep = () => {
        switch (step) {
            case AppStep.Configure:
                return (
                    <div>
                        <WindowConfigurator onAddToCart={handleAddToCart} />
                        <OrderSummary cart={cart} onRemoveItem={handleRemoveFromCart} onProceed={handleProceedToCheckout} />
                    </div>
                );
            case AppStep.Checkout:
                return <CheckoutForm onPlaceOrder={handlePlaceOrder} onBack={() => setStep(AppStep.Configure)} />;
            case AppStep.Invoice:
                return orderDetails && <Invoice order={orderDetails} onConfirmPayment={handleConfirmPayment} />;
            case AppStep.Confirmation:
                return orderDetails && <PaymentConfirmation orderNumber={orderDetails.orderNumber} onNewOrder={handleStartNewOrder} />;
            default:
                return <div>Error: Paso desconocido.</div>;
        }
    };

    const renderView = () => {
        switch(view) {
            case AppView.TechnicalInfo:
                return <TechnicalInfo />;
            case AppView.FAQ:
                return <FAQ />;
            case AppView.Configurator:
            default:
                return (
                    <>
                        {step !== AppStep.Confirmation && <div className="mb-12 pt-4"><StepIndicator currentStep={step} /></div>}
                        <div className="mt-8">
                            {renderStep()}
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-100">
            <Header />
            <Navigation currentView={view} setView={setView} />
            <main className="flex-grow container mx-auto px-4 py-8">
                {renderView()}
            </main>
            <Footer />
            {isNetlify && <ChatBubble onClick={() => setIsChatOpen(true)} />}
            {isChatOpen && <AIChatWindow onClose={() => setIsChatOpen(false)} />}
        </div>
    );
};

// === FIN: Componente Principal App ===


// === INICIO: Punto de Entrada de la Aplicación (Render) ===
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("No se encontró el elemento 'root' en el DOM.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
// === FIN: Punto de Entrada de la Aplicación (Render) ===
