import { createLocalOpenApiDocument } from '../../api-contract';

describe('PokeLoungeRoomResponseDto terminal transition contract', () => {
  let document: unknown;

  beforeAll(async () => {
    document = await createLocalOpenApiDocument();
  });

  it('requires a bounded transition array while keeping current competitive assignment optional and non-null', () => {
    const room = schema('PokeLoungeRoomResponseDto');
    const roomProperties = requireRecord(
      room.properties,
      'PokeLoungeRoomResponseDto.properties',
    );
    const transitions = requireSchema(
      roomProperties.competitiveTransitions,
      'PokeLoungeRoomResponseDto.competitiveTransitions',
    );
    const competitive = requireReference(
      roomProperties.competitive,
      'PokeLoungeRoomResponseDto.competitive',
    );

    const required = requireStringArray(
      room.required,
      'PokeLoungeRoomResponseDto.required',
    );
    expect(required).toContain('competitiveTransitions');
    expect(required).not.toContain('competitive');
    expect(transitions).toMatchObject({
      type: 'array',
      maxItems: 8,
      items: {
        $ref: '#/components/schemas/CompetitiveTerminalTransitionDto',
      },
    });
    expect(competitive).toMatchObject({
      $ref: '#/components/schemas/CompetitiveActionResponseDto',
    });
    expect(competitive).not.toMatchObject({ nullable: true });
  });

  it('requires wrapper metadata and its completed action projection', () => {
    const transition = schema('CompetitiveTerminalTransitionDto');
    const properties = requireRecord(
      transition.properties,
      'CompetitiveTerminalTransitionDto.properties',
    );

    expect(
      requireStringArray(
        transition.required,
        'CompetitiveTerminalTransitionDto.required',
      ),
    ).toEqual(
      expect.arrayContaining([
        'terminalEventId',
        'terminalRoomRevision',
        'projection',
      ]),
    );
    expect(properties).toMatchObject({
      terminalEventId: { type: 'string', format: 'uuid' },
      terminalRoomRevision: { type: 'number', minimum: 0 },
      projection: {
        $ref: '#/components/schemas/CompetitiveActionResponseDto',
      },
    });
  });

  function schema(name: string): Record<string, unknown> {
    const documentRecord = requireRecord(document, 'OpenAPI document');
    const components = requireRecord(
      documentRecord.components,
      'OpenAPI components',
    );
    const schemas = requireRecord(
      components.schemas,
      'OpenAPI component schemas',
    );

    return requireSchema(schemas[name], name);
  }

  function requireSchema(
    value: unknown,
    name: string,
  ): Record<string, unknown> {
    const schema = requireRecord(value, name);
    if (typeof schema.$ref === 'string') {
      throw new Error(`Expected inline OpenAPI schema for ${name}`);
    }

    return schema;
  }

  function requireReference(
    value: unknown,
    name: string,
  ): Record<string, unknown> {
    const reference = requireRecord(value, name);
    if (typeof reference.$ref !== 'string') {
      throw new Error(`Expected OpenAPI reference for ${name}`);
    }

    return reference;
  }

  function requireRecord(
    value: unknown,
    name: string,
  ): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Expected object for ${name}`);
    }

    return value as Record<string, unknown>;
  }

  function requireStringArray(value: unknown, name: string): string[] {
    if (!Array.isArray(value)) {
      throw new Error(`Expected string array for ${name}`);
    }

    const items: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        throw new Error(`Expected string array for ${name}`);
      }
      items.push(item);
    }

    return items;
  }
});
