import type { Basemap } from './types';

export const basemaps: Basemap[] = [
    {
        id: 'voyager',
        name: 'Voyager',
        url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
    },
    {
        id: 'positron',
        name: 'Positron (Light)',
        url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    },
    {
        id: 'dark-matter',
        name: 'Dark Matter',
        url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    }
];

export const defaultBasemap = basemaps[0];
