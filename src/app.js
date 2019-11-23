import { MongoClient, ObjectID } from "mongodb";
import { GraphQLServer } from "graphql-yoga";

import "babel-polyfill";

const usr = "avalero";
const pwd = "123456abc";
const url = "cluster0-vbkmi.gcp.mongodb.net/test?retryWrites=true&w=majority";
/**
 * Connects to MongoDB Server and returns connected client
 * @param {string} usr MongoDB Server user
 * @param {string} pwd MongoDB Server pwd
 * @param {string} url MongoDB Server url
 */
//NOS CONECTAMOS A LA BASE DE DATOS
const connectToDb = async function(usr, pwd, url) {
  const uri = `mongodb+srv://${usr}:${pwd}@${url}`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await client.connect();
  return client;
};

/**
 * Starts GraphQL server, with MongoDB Client in context Object
 * @param {client: MongoClinet} context The context for GraphQL Server -> MongoDB Client
 */
const runGraphQLServer = function(context) {
  const typeDefs = `
    type Query{
      getAuthor(id: ID!): Author
      getAuthors: [Author]!
      getReceta(id:ID!):Recetas
      getRecetas: [Recetas!]!
      getRecetasAutor(autor:ID!): [Recetas!]!
      getRecetasIngrediente(ingredientes:ID!):Recetas
      getIngrediente(id:ID!):Ingredientes
      getIngredientes:[Ingredientes!]!
    }
    type Mutation{
      addAuthor(name: String!, email:String!):Author!
      addIngrediente(nombre:String!):Ingredientes!
      addReceta(titulo: String!,descripcion: String!,autor: String!,autor: String!,ingredientes:[String!]!):Recetas!
      deleteReceta(id:ID!): String
      deleteAutor(id:ID!):String
      deleteIngrediente(id:ID!):String
      updateAutor(id:ID!,name:String!,email:String!): Author!
      updateReceta(id:ID!,titulo:String!,descripcion:String,ingredientes:[String!]): Recetas!
      updateIngrediente(id:ID!,nombre:String!):Ingredientes!
      
    }
    type Author{
      id: ID!
      name: String!
      email: String!
    }
    type Ingredientes{
        id: ID!
        nombre: String!
    }
    type Recetas{
        id: ID!
        titulo: String!
        descripcion: String!
        fecha: String!
        autor: Author!
        ingredientes: [Ingredientes!]!
    }
    `;

  const resolvers = {
    Recetas:{
        autor:async(parent,args,ctx,info)=>{
            const autorID = parent.autor;
            const {client} = ctx;
            const db = client.db("Recet");
            const collection = db.collection("authors");
    
            return (await collection.findOne({_id: ObjectID(autorID)}));
        },
        ingredientes:async(parent,args,ctx,info)=>{
            const ingredientes = [];//Vamos a devolver el array 
            const ingredienteID = parent.ingredientes;
            const {client} = ctx;
            const db = client.db("Recet");
            const collection = db.collection("Ingredientes");

            ingredienteID.forEach(elem=>{//PREGUNTAR LA LINEA DE ABAJO A VALERO
                ingredientes.push(collection.findOne({_id:ObjectID(elem)}));//NO hace falta que sea await porque el graphql se encarga despues de transformarlas en objetos
            })

            const ingreds = await Promise.all(ingredientes);

           // return (await collection.findOne({_id: ObjectID(ingredienteID)}));
           return ingreds;
        }
    },
    Query: {
      getAuthor: async (parent, args, ctx, info) => {
        const { id } = args;
        const { client } = ctx;
        const db = client.db("Recet");
        const collection = db.collection("authors");
        const result = await collection.findOne({ _id: ObjectID(id) });
        return result;
      },
      getAuthors: async (parent, args, ctx, info) => {
        const { client } = ctx;
        const db = client.db("Recet");
        const collection = db.collection("authors");
        return collection.find({}).toArray();
      },
      getReceta:async(parent,args,ctx,info)=>{
          const { id } = args;
          const  {client} = ctx;
          const db = client.db("Recet");
          const collection = db.collection("Recetas");
          const result = await collection.findOne({_id: ObjectID(id)});
          return result;
      },
      getRecetas:async(parent,args,ctx,info)=>{
          const {client} = ctx;
          const db = client.db("Recet");
          const collection = db.collection("Recetas");
          const result = await collection.find({}).toArray();
          console.log(result[1]);
          return result;
      },
      getRecetasAutor:async(parent,args,ctx,info)=>{
          const recetas = [];
          const {autor} = args; //eSTE ES EL id del autor
          const {client} = ctx;
          const db = client.db("Recet");
          const collection = db.collection("Recetas");
          const aux = await collection.find({}).toArray();//Así es el array de todas las recetas que hay
          aux.forEach(elem=>{
              recetas.push(collection.findOne({autor}));//metemos en el array recetas aquellas recetas que tengan como autor el que le pasamos
          })
          return recetas;
      },

      getIngrediente:async(parent,args,ctx,info)=>{
          const {id} = args;
          const {client} = ctx;
          const db = client.db("Recet");
          const collection = db.collection("Ingredientes");
          const result = await collection.findOne({_id: ObjectID(id)});
          return result;
      },
      getIngredientes:async(parent,args,ctx,info)=>{
          const {client} = ctx;
          const db = client.db("Recet");
          const collection = db.collection("Ingredientes");
          const result = await collection.find({}).toArray();
          return result;
      }
    },
    Mutation: {
      addAuthor: async (parent, args, ctx, info) => {
        const { name, email } = args;
        const { client } = ctx;

        const db = client.db("Recet");
        const collection = db.collection("authors");
        if(await collection.findOne({email})){
            throw new Error(`El autor ya existe`);
        }
        const result = await collection.insertOne({ name, email });

        return {
          name,
          email,
          id: result.ops[0]._id
        };
      },
      addIngrediente: async (parent,args,ctx,info) => {
        const{nombre} = args;
        const{client} = ctx;

        const db = client.db("Recet");
        const collection = db.collection("Ingredientes");
        if(await collection.findOne({nombre})){
            throw new Error(`El ingrediente ya existe`);
        }
        const result = await collection.insertOne({nombre});
        return{
            nombre
        }
      },
      addReceta: async (parent,args,ctx,info)=>{
          const {titulo,descripcion,autor,ingredientes} = args;
          const {client} = ctx;

          const db = client.db("Recet");
          const collection = db.collection("Recetas");
          if(await collection.findOne({titulo})){
              throw new Error(`La receta ya existe`);
          }
          const result = await collection.insertOne({titulo,descripcion,autor,ingredientes});
          return{
              titulo,
              descripcion,
              autor,
              ingredientes
          };
      },
      deleteReceta: async(parent,args,ctx,info)=>{
        const {id} = args;
        const {client} = ctx;
        const db = client.db("Recet");
        const collection = db.collection("Recetas");
        if(!await collection.findOne({_id : ObjectID(id)})){
          throw new Error(`La receta no existe`);
        }
        await collection.deleteOne({_id: ObjectID(id)});
        if(!await collection.findOne({_id_: ObjectID(id)})){
          console.log("La receta ha sido eliminada con exito");
          return "Se ha eliminado con exito";
        }
      },
      deleteAutor:  async(parent,args,ctx,info)=>{
        const {id}= args;
        const {client} = ctx;
        const db = client.db("Recet");
        const collection = db.collection("authors");
        const collection2 = db.collection("Recetas");
        if(!await collection.findOne({_id: ObjectID(id)})){
          throw new Error (`El autor no existe`);
        }
        await collection.deleteOne({_id: ObjectID(id)});
        //collection = db.collection("Recetas");
        await collection2.deleteMany({autor: id});
        if(!await collection.findOne({_id: ObjectID(id)})){
          if(!await collection.findOne({autor:id})){
            return "El autor y sus recetas se han eliminado con exito";
          }
          return "El autor se ha eliminado con exito";
        }
      },
      deleteIngrediente: async(parent,args,ctx,info)=>{
        const {id} = args;
        const {client} = ctx;
        const db = client.db("Recet");
        const collection = db.collection("Ingredientes");
        const collection2 = db.collection("Recetas");

        if(!await collection.findOne({_id: ObjectID(id)})){
          throw new Error(`Ese ingrediente no existe`);
        }
        const recetasEliminadas = []; 
        const aux = await collection2.find({}).toArray();//ESto es un array de todas las recetas

        aux.forEach(elem=>{
          if(elem.ingredientes.some(ts => ts === id)){
            recetasEliminadas.push(elem);
          }
        })

        recetasEliminadas.forEach(async(elem)=>{ 
          await collection2.deleteOne({_id:ObjectID(elem._id)});
        })

        await collection.deleteOne({_id:ObjectID(id)});

      },
      updateAutor:async(parent,args,ctx,info)=>{
        const {id,name,email} = args;
        const {client} = ctx;
        const db = client.db("Recet");
        const collection = db.collection("authors");

        await collection.updateOne({_id:ObjectID(id)},{$set:{"name":name,"email":email}});
        return await collection.findOne({_id:ObjectID(id)});
        
      },
      updateReceta:async(parent,args,ctx,info) =>{
        const{id,titulo,descripcion,ingredientes} = args;
        const {client} = ctx;
        const db = client.db("Recet");
        const collection = db.collection("Recetas");

        await collection.updateOne({_id:ObjectID(id)},{$set:{"titulo":titulo,"descripcion":descripcion,"ingredientes":ingredientes}});
        return await collection.findOne({_id:ObjectID(id)});
      },
      updateIngrediente:async(parent,args,ctx,info)=>{
        const{id,nombre} = args;
        const {client} = ctx;
        const db = client.db("Recet");
        const collection = db.collection("Ingredientes");

        await collection.updateOne({_id:ObjectID(id)},{$set:{"nombre":nombre}});
        return await collection.findOne({_id:ObjectID(id)});
      }
    }
  };

  const server = new GraphQLServer({ typeDefs, resolvers, context });
  const options = {
    port: 8000
  };

  try {
    server.start(options, ({ port }) =>
      console.log(
        `Server started, listening on port ${port} for incoming requests.`
      )
    );
  } catch (e) {
    console.info(e);
    server.close();
  }
};

const runApp = async function() {
  const client = await connectToDb(usr, pwd, url);
  console.log("Connect to Mongo DB");
  try {
    runGraphQLServer({ client });
  } catch (e) {
      console.log(e)
    client.close();
  }
};

runApp();
