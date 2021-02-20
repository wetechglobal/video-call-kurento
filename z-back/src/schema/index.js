import requireDirectory from 'require-directory';
import { makeExecutableSchema } from 'graphql-tools';
import { mergeTypes, mergeResolvers } from 'merge-graphql-schemas';

const schemaDir = requireDirectory(module, {
  recurse: false,
});
const schemaDefs = Object.keys(schemaDir).map(k => schemaDir[k]);

const typeDefs = mergeTypes(schemaDefs.filter(def => def.typeDef).map(def => def.typeDef));
const resolvers = mergeResolvers(schemaDefs.filter(def => def.resolver).map(def => def.resolver));

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export { resolvers, typeDefs };
export default schema;
