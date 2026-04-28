// src/components/__tests__/l1Seed.test.jsx
//
// Unit tests for L1Seed component — candidate generation UI and flow

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { L1Seed } from '../stages/l1Seed.jsx';
import { createMemoryAdapter } from '../../lib/storage/memory.js';
import { seedFixtureCandidates } from '../../lib/storage/__tests__/fixtures.js';

describe('L1Seed', () => {
  let storage;
  let projectId;

  beforeEach(async () => {
    storage = await createMemoryAdapter();
    const project = await storage.createProject({ title: 'Test Project' });
    projectId = project.id;

    // Seed fixture candidates
    await seedFixtureCandidates(storage, projectId);
  });

  it('renders advanced options collapsible section', async () => {
    render(<L1Seed storage={storage} projectId={projectId} />);

    await waitFor(() => {
      expect(screen.getByText(/ADVANCED OPTIONS/i)).toBeInTheDocument();
    });
  });

  it('generates and displays seed candidates when button clicked', async () => {
    render(<L1Seed storage={storage} projectId={projectId} />);

    await waitFor(() => {
      expect(screen.getByText(/ADVANCED OPTIONS/i)).toBeInTheDocument();
    });

    // Open advanced options
    fireEvent.click(screen.getByText(/ADVANCED OPTIONS/i));

    await waitFor(() => {
      expect(screen.getByText(/GENERATE 3 CANDIDATES/i)).toBeInTheDocument();
    });

    // Click generate button
    fireEvent.click(screen.getByText(/GENERATE 3 CANDIDATES/i));

    // Wait for candidates to appear
    await waitFor(() => {
      expect(screen.getByText(/A dark fantasy tale of betrayal/i)).toBeInTheDocument();
      expect(screen.getByText(/An uplifting adventure/i)).toBeInTheDocument();
      expect(screen.getByText(/A mystery unfolding/i)).toBeInTheDocument();
    });
  });

  it('allows picking a candidate', async () => {
    render(<L1Seed storage={storage} projectId={projectId} />);

    await waitFor(() => {
      expect(screen.getByText(/ADVANCED OPTIONS/i)).toBeInTheDocument();
    });

    // Open advanced options and generate
    fireEvent.click(screen.getByText(/ADVANCED OPTIONS/i));
    fireEvent.click(screen.getByText(/GENERATE 3 CANDIDATES/i));

    await waitFor(() => {
      expect(screen.getByText(/A dark fantasy tale of betrayal/i)).toBeInTheDocument();
    });

    // Pick the first candidate
    const pickButtons = screen.getAllByText(/^PICK$/i);
    fireEvent.click(pickButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/✓ PICKED/i)).toBeInTheDocument();
    });
  });

  it('enables lock button only when candidate is picked', async () => {
    render(<L1Seed storage={storage} projectId={projectId} />);

    await waitFor(() => {
      expect(screen.getByText(/ADVANCED OPTIONS/i)).toBeInTheDocument();
    });

    // Lock button should be disabled initially
    const lockButton = screen.getByText(/LOCK & ADVANCE TO L2/i);
    expect(lockButton).toBeDisabled();

    // Open advanced options and generate
    fireEvent.click(screen.getByText(/ADVANCED OPTIONS/i));
    fireEvent.click(screen.getByText(/GENERATE 3 CANDIDATES/i));

    await waitFor(() => {
      expect(screen.getByText(/A dark fantasy tale of betrayal/i)).toBeInTheDocument();
    });

    // Pick first candidate
    const pickButtons = screen.getAllByText(/^PICK$/i);
    fireEvent.click(pickButtons[0]);

    await waitFor(() => {
      expect(lockButton).not.toBeDisabled();
    });
  });

  it('locks stage with picked candidate artifact', async () => {
    const onLock = vi.fn();
    render(<L1Seed storage={storage} projectId={projectId} onLock={onLock} />);

    await waitFor(() => {
      expect(screen.getByText(/ADVANCED OPTIONS/i)).toBeInTheDocument();
    });

    // Open advanced options, generate, and pick
    fireEvent.click(screen.getByText(/ADVANCED OPTIONS/i));
    fireEvent.click(screen.getByText(/GENERATE 3 CANDIDATES/i));

    await waitFor(() => {
      expect(screen.getByText(/A dark fantasy tale of betrayal/i)).toBeInTheDocument();
    });

    const pickButtons = screen.getAllByText(/^PICK$/i);
    fireEvent.click(pickButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/✓ PICKED/i)).toBeInTheDocument();
    });

    // Lock the stage
    const lockButton = screen.getByText(/LOCK & ADVANCE TO L2/i);
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(onLock).toHaveBeenCalledWith('seed', expect.objectContaining({
        premise: expect.stringContaining('A dark fantasy tale of betrayal'),
        genre: 'Dark Fantasy',
        tone: 'dark',
      }));
    });
  });
});
