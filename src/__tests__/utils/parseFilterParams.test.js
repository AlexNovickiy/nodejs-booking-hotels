import { describe, it, expect } from 'vitest';
import { parseFilterParams } from '../../utils/parseFilterParams.js';

describe('parseFilterParams', () => {
  it('повертає порожній обʼєкт якщо query порожній', () => {
    expect(parseFilterParams({})).toEqual({});
  });

  it('парсить рядок пошуку q', () => {
    expect(parseFilterParams({ q: 'Kyiv' })).toEqual({ q: 'Kyiv' });
  });

  it('ігнорує q якщо не рядок', () => {
    expect(parseFilterParams({ q: 123 })).toEqual({});
    expect(parseFilterParams({ q: null })).toEqual({});
  });

  it('парсить guests як число', () => {
    expect(parseFilterParams({ guests: '3' })).toEqual({ guests: 3 });
  });

  it('ігнорує guests якщо не число або <= 0', () => {
    expect(parseFilterParams({ guests: 'abc' })).toEqual({});
    expect(parseFilterParams({ guests: '0' })).toEqual({});
    expect(parseFilterParams({ guests: '-1' })).toEqual({});
  });

  it('парсить одночасно q і guests', () => {
    expect(parseFilterParams({ q: 'Lviv', guests: '2' })).toEqual({
      q: 'Lviv',
      guests: 2,
    });
  });
});
