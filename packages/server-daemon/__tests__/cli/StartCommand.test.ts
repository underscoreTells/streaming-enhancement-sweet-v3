import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StartCommand } from '../../src/cli/StartCommand';

describe('StartCommand', () => {
  let processExitSpy: any;

  beforeEach(() => {
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should create instance with options', () => {
    const command = new StartCommand({
      configPath: '/path/to/config',
      port: '8080',
      logLevel: 'debug'
    });

    expect(command).toBeDefined();
  });

  it('should create instance without options', () => {
    const command = new StartCommand();
    expect(command).toBeDefined();
  });

  it('should return a Command object', () => {
    const command = new StartCommand();
    const cmd = command.getCommand();

    expect(cmd).toBeDefined();
    expect(cmd.name()).toBe('start');
  });
});