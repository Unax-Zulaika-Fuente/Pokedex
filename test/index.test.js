import { describe, it, expect } from 'jest';
import { someFunction } from '../src/index';

describe('Pruebas unitarias para index.js', () => {
    it('debería retornar el resultado esperado de someFunction', () => {
        const result = someFunction();
        expect(result).toBe('resultado esperado');
    });

    // Agrega más pruebas según sea necesario
});