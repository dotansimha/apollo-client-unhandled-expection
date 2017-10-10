const { ApolloClient, createNetworkInterface } = require('apollo-client');
const gql = require('graphql-tag');
const { makeExecutableSchema } = require('graphql-tools');
const { find, filter } = require('lodash');
const { execute } = require('graphql');

// Schema

const typeDefinitions = `
type Author {
  id: Int! 
  firstName: String
  lastName: String
  posts: [Post]
}

type Post {
  id: Int!
  title: String
  author: Author
  votes: Int
}

type Query {
  posts: [Post]
}

schema {
  query: Query
}
`;

const authors = [
  { id: 1, firstName: 'Tom', lastName: 'Coleman' },
  { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
];

const posts = [
  { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
  { id: 2, authorId: 2, title: 'GraphQL Rocks', votes: 3 },
  { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
];

let counter = 0;

const resolveFunctions = {
  Query: {
    posts() {
      if (counter === 0) {
        counter++;
        return posts;
      } else {
        throw new Error('oops');
      }
    },
  },
  Author: {
    posts(author) {
      return filter(posts, { authorId: author.id });
    },
  },
  Post: {
    author(post) {
      return find(authors, { id: post.authorId });
    },
  }
}

const schema = makeExecutableSchema({
  typeDefs: typeDefinitions,
  resolvers: resolveFunctions,
});

// Client side

const allPosts = gql`
  query allPosts {
    posts {
      id
      title
      votes
      author {
        id
        firstName
        lastName
      }
    }
  }`;


class InBrowserNetworkInterface {
  query(request) {
    return execute(
      schema,
      request.query,
      {},
      {},
      request.variables,
      request.operationName);
  }
}

const networkInterface = new InBrowserNetworkInterface();

const client = new ApolloClient({
  networkInterface,
  dataIdFromObject: r => r.id,
});

client.watchQuery({
  query: allPosts,
  pollingInterval: 5000,
}).subscribe({
  next: console.log,
  error: e => {
    console.log('error caught:', e);
  },
});

