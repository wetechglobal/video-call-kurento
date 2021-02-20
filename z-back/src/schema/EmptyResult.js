import { GraphQLScalarType } from 'graphql';

const typeDef = `
  scalar EmptyResult
`;

const resolver = {
  EmptyResult: new GraphQLScalarType({
    name: 'EmptyResult',
    description: 'A scalar type for empty result',
    serialize: () => null,
    parseValue: () => null,
    parseLiteral: () => null,
  }),
};

export { typeDef, resolver };
