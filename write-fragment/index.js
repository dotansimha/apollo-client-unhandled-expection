const gql = require('graphql-tag');
const { makeExecutableSchema } = require('graphql-tools');
const { find, filter } = require('lodash');
const { execute } = require('graphql');

const { ApolloClient } = require('apollo-client');
const { Observable } = require('rxjs');
const { ApolloLink } = require('apollo-link');
const { InMemoryCache } = require('apollo-cache-inmemory');

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

const resolveFunctions = {
  Query: {
    posts() {
      return posts;
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
};

const schema = makeExecutableSchema({
  typeDefs: typeDefinitions,
  resolvers: resolveFunctions,
});

// Client side

const postFragment = gql`
  fragment PostFields on Post {
    id
    title
    votes
    author {
      id
      firstName
      lastName
    }
  }
`;

const allPosts = gql`
  query allPosts {
    posts {
      ...PostFields
      
    }
  }

  ${postFragment}
`;

const link = new ApolloLink(operation => {
  const { operationName, variables, query } = operation;

  return Observable.fromPromise(
    execute(
      schema,
      query,
      {},
      {},
      variables,
      operationName)
  );
});

const client = new ApolloClient({
  link,
  cache: new InMemoryCache().restore({}),
});

// Execute the query
client.watchQuery({
  query: allPosts,
}).subscribe({
  next: data => {
    console.log('Post data:', data.data.posts[0]);
  },
  error: e => {
    console.log('error caught:', e);
  },
});

// Manually update the store
setTimeout(() => {
  client.writeFragment({
    id: '1', // Change to "Post:1" to make it work
    fragment: postFragment,
    data: {
      ...posts[0],
      author: {
        __typename: 'Author',
        ...authors[0]
      },
      __typename: 'Post',
      title: 'New title',
    },
  });

  client.queryManager.broadcastQueries();
}, 300);
