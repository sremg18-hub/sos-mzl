export const APP_NAME = 'SOS Manizales';
export const APP_FULL_NAME = 'Alcaldía de Manizales — Revisión a Predio';
export const FORM_CODE = 'GUE-RPD-FR-02';
export const FORM_VERSION = 'Versión 4';
export const SESSION_COOKIE = 'sosmzl_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export const ROL_ENCUESTADO_OPTIONS = ['Propietario', 'Arrendatario', 'Sucesión', 'Otro'] as const;

export const TIPO_EVENTO_OPTIONS = [
	'Deslizamiento',
	'Avalancha',
	'Incendio',
	'Inundación',
	'Vendaval',
	'Otro'
] as const;

export const DETERIORO_OPTIONS = [
	'Falta de Mantenimiento',
	'Intervención Antrópica',
	'Evento Natural'
] as const;

export const NIVEL_AFECTACION_OPTIONS = ['Total', 'Parcial', 'Ninguna'] as const;

export const INFRA_OPTIONS = [
	{ value: 'Vivienda', label: 'Infraestructura de Vivienda' },
	{ value: 'Vial', label: 'Infraestructura Vial' },
	{ value: 'Educativa', label: 'Infraestructura Educativa' },
	{ value: 'Comunitaria', label: 'Infraestructura Comunitaria' }
] as const;

export const ENTIDADES_VISITA_OPTIONS = [
	'UGR',
	'Corpocaldas',
	'Aguas de Manizales',
	'Obras Públicas Municipales',
	'Invías',
	'Chec',
	'Invama',
	'Planeación',
	'Sec. Infraestructura Depto.',
	'Inspección de Policía',
	'Otro'
] as const;

export const TIPO_DOC_OPTIONS = ['CC', 'TI', 'CE', 'PAS', 'NIT'] as const;

export const ALCALDIA_PHONE = '887 9700';
export const FREE_LINE = '018000068988';
export const CRUZ_ROJA_PHONE = '886 6300';
