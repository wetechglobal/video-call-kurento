import { GraphQLDateTime } from 'graphql-iso-date';

const typeDef = `
  scalar Date
`;

const resolver = {
  Date: GraphQLDateTime,
};

export { typeDef, resolver };
