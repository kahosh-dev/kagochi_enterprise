import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartCard } from '../../ChartCard';

test('ChartCard shows loading state', () => {
  render(<ChartCard title="Test" loading={true}>Content</ChartCard>);
  expect(screen.getByText(/Loading chart…/i)).toBeInTheDocument();
});

test('ChartCard shows error state', () => {
  render(<ChartCard title="Test" error="Boom">Content</ChartCard>);
  expect(screen.getByText(/Error: Boom/i)).toBeInTheDocument();
});

test('ChartCard shows empty state', () => {
  render(<ChartCard title="Test" empty={true}>Content</ChartCard>);
  expect(screen.getByText(/No data for this period./i)).toBeInTheDocument();
});

test('ChartCard renders children when ready', () => {
  render(<ChartCard title="Test">Hello</ChartCard>);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
