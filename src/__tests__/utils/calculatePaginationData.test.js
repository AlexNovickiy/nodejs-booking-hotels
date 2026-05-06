import { describe, it, expect } from 'vitest';
import { calculatePaginationData } from '../../utils/calculatePaginationData.js';

describe('calculatePaginationData', () => {
  it('повертає коректні дані для першої сторінки', () => {
    const result = calculatePaginationData(25, 10, 1);
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('повертає коректні дані для середньої сторінки', () => {
    const result = calculatePaginationData(25, 10, 2);
    expect(result).toEqual({
      page: 2,
      perPage: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('повертає коректні дані для останньої сторінки', () => {
    const result = calculatePaginationData(25, 10, 3);
    expect(result).toEqual({
      page: 3,
      perPage: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('округляє кількість сторінок вгору при нерівному поділі', () => {
    const result = calculatePaginationData(11, 10, 1);
    expect(result.totalPages).toBe(2);
    expect(result.hasNextPage).toBe(true);
  });

  it('одна сторінка коли елементів менше або рівно perPage', () => {
    const result = calculatePaginationData(5, 10, 1);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('нуль елементів — totalPages = 0', () => {
    const result = calculatePaginationData(0, 10, 1);
    expect(result.totalPages).toBe(0);
    expect(result.totalItems).toBe(0);
  });
});
