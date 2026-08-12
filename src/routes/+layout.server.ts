import './layout.css';
import '@fontsource-variable/inter';

export const ssr = true;
export const prerender = false;

export function load({ locals }) {
	return { user: locals.user };
}
