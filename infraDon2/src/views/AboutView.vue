<script lang="ts">
import { ref } from 'vue';
import PouchDB from 'pouchdb';
import pouchdbFind from 'pouchdb-find';

PouchDB.plugin(pouchdbFind);

interface Post {
  _id: string;
  _rev?: string; // Révision nécessaire pour modification/suppression
  post_name: string;
  post_content: string;
  attributes: {
    creation_date: string;
  };
  media?: string[]; // Liste des médias associés
}

export default {
  data() {
    return {
      postsData: [] as Post[], // Liste des documents
      document: null as Post | null, // Document sélectionné pour modification
      storage: null as PouchDB.Database | null, // Base locale
      remoteDB: null as PouchDB.Database | null, // Base distante
      searchQuery: '', // Texte de recherche
      selectedFile: null as File | null, // Fichier sélectionné pour ajout
    };
  },

  mounted() {
    this.initDatabases();
    this.syncDatabases();
    this.fetchData();
    this.createIndex();
    this.watchDatabaseChanges();
  },

  methods: {
    async initDatabases() {
      try {
        this.storage = new PouchDB('local_posts'); // Base locale
        this.remoteDB = new PouchDB('http://admin:admin@localhost:5984/post'); // Base distante
        console.log("Bases 'local_posts' et 'post' initialisées");
      } catch (error) {
        console.error('Erreur d’initialisation des bases :', error);
      }
    },

    syncDatabases() {
      if (!this.storage || !this.remoteDB) {
        console.warn('Bases de données non initialisées');
        return;
      }

      PouchDB.sync(this.storage, this.remoteDB, {
        live: true,
        retry: true,
      })
        .on('change', (info) => {
          console.log('Changements synchronisés :', info);
          this.fetchData();
        })
        .on('error', (err) => {
          console.error('Erreur lors de la synchronisation :', err);
        });
    },

    watchDatabaseChanges() {
      if (!this.storage) return;

      this.storage
        .changes({
          since: 'now',
          live: true,
          include_docs: true,
        })
        .on('change', (change) => {
          console.log('Changement détecté :', change);
          this.fetchData();
        })
        .on('error', (err) => {
          console.error('Erreur de surveillance des changements :', err);
        });
    },

    async fetchData() {
      if (!this.storage) return;

      try {
        const result = await this.storage.allDocs({
          include_docs: true,
        });

        this.postsData = result.rows.map((row: any) => row.doc);
        console.log('Documents récupérés :', this.postsData);
      } catch (error) {
        console.error('Erreur lors de la récupération des documents :', error);
      }
    },

    async saveDocument(post: Post) {
      if (!this.storage) return;

      try {
        await this.storage.put(post);
        console.log('Document ajouté ou mis à jour avec succès');
        this.fetchData();
      } catch (error) {
        console.error('Erreur lors de l’ajout ou de la mise à jour du document :', error);
      }
    },

    async deletePost(post: Post) {
      if (!this.storage) return;

      try {
        await this.storage.remove(post._id, post._rev!);
        console.log('Document supprimé');
        this.fetchData();
      } catch (error) {
        console.error('Erreur lors de la suppression du document :', error);
      }
    },

    addFakePost() {
      const fakePost: Post = {
        _id: new Date().toISOString(),
        post_name: `Post ${Math.random().toString(36).substring(7)}`,
        post_content: 'Contenu aléatoire',
        attributes: {
          creation_date: new Date().toISOString(),
        },
        media: [],
      };

      this.saveDocument(fakePost);
    },

    async createIndex() {
      if (!this.storage) return;

      try {
        await this.storage.createIndex({
          index: { fields: ['post_name'] },
        });
        console.log('Index sur "post_name" créé avec succès');
      } catch (error) {
        console.error('Erreur lors de la création de l’index :', error);
      }
    },

    async searchByQuery() {
      if (!this.storage || !this.searchQuery) return;

      try {
        const result = await this.storage.find({
          selector: {
            post_name: { $regex: new RegExp(this.searchQuery, 'i') },
          },
        });

        if (result && Array.isArray(result.docs)) {
          this.postsData = result.docs as Post[];
        } else {
          console.warn('Aucun document trouvé.');
          this.postsData = [];
        }
        console.log('Résultats de la recherche :', this.postsData);
      } catch (error) {
        console.error('Erreur lors de la recherche :', error);
      }
    },

    async attachMedia(post: Post, file: File | null) {
      if (!this.storage || !file) {
        console.warn('Aucun fichier sélectionné ou base non initialisée.');
        return;
      }

      try {
        const updatedDoc = await this.storage.get(post._id);
        await this.storage.putAttachment(post._id, file.name, updatedDoc._rev, file, file.type);
        console.log('Média ajouté avec succès');
        this.fetchData();
      } catch (error) {
        console.error('Erreur lors de l’ajout du média :', error);
      }
    },

    async fetchMedia(post: Post, mediaName: string) {
      if (!this.storage) return;

      try {
        const blob = await this.storage.getAttachment(post._id, mediaName);
        if (blob) {
          const url = URL.createObjectURL(blob as Blob);
          window.open(url, '_blank');
        } else {
          console.warn('Média introuvable pour ce document.');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du média :', error);
      }
    },

    async deleteMedia(post: Post, mediaName: string) {
      if (!this.storage) return;

      try {
        const updatedDoc = await this.storage.get(post._id);
        await this.storage.removeAttachment(post._id, mediaName, updatedDoc._rev);
        console.log('Média supprimé avec succès');
        this.fetchData();
      } catch (error) {
        console.error('Erreur lors de la suppression du média :', error);
      }
    },

    editPost(post: Post) {
      this.document = { ...post }; // Copier les données
    },

    async updateDocument() {
      if (!this.document || !this.storage) return;

      try {
        await this.saveDocument(this.document);
        this.document = null; // Réinitialiser le formulaire
      } catch (error) {
        console.error('Erreur lors de la mise à jour :', error);
      }
    },

    handleFileUpload(event: Event) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.selectedFile = target.files[0];
      }
    },
  },
};
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>📄 Gestion des Posts</h1>
      <p class="subtitle">Nombre de posts : {{ postsData.length }}</p>
      <input v-model="searchQuery" @input="searchByQuery" placeholder="Rechercher par nom" class="search-input" />
    </header>

    <div class="content">
      <!-- Liste des documents -->
      <ul v-if="postsData && postsData.length > 0" class="post-list">
        <li v-for="post in postsData" :key="post._id" class="post-item">
          <div class="post-header">
            <h2>{{ post.post_name }}</h2>
            <em>{{ post.attributes.creation_date }}</em>
          </div>
          <p class="post-content">{{ post.post_content }}</p>
          <div class="post-media" v-if="post.media && post.media.length > 0">
            <h4>Médias :</h4>
            <ul>
              <li v-for="media in post.media" :key="media">
                {{ media }}
                <button @click="fetchMedia(post, media)" class="view-button">Voir</button>
                <button @click="deleteMedia(post, media)" class="delete-button">Supprimer</button>
              </li>
            </ul>
          </div>
          <div class="post-actions">
            <button @click="editPost(post)" class="edit-button">✏️ Modifier</button>
            <button @click="deletePost(post)" class="delete-button">🗑️ Supprimer</button>
            <input type="file" @change="handleFileUpload" class="file-input" />
            <button @click="attachMedia(post, selectedFile)" class="attach-button">➕ Ajouter un média</button>
          </div>
        </li>
      </ul>
      <p v-else class="no-posts">Aucun post trouvé.</p>

      <!-- Ajouter un post démo -->
      <button @click="addFakePost" class="add-button">➕ Ajouter un post démo</button>

      <!-- Formulaire d'édition -->
      <div v-if="document" class="edit-form">
        <h3>Modifier un post</h3>
        <form @submit.prevent="updateDocument">
          <input v-model="document.post_name" placeholder="Nom du post" class="input" />
          <textarea v-model="document.post_content" placeholder="Contenu" class="textarea"></textarea>
          <div class="form-actions">
            <button type="submit" class="save-button">✅ Enregistrer</button>
            <button type="button" @click="document = null" class="cancel-button">❌ Annuler</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'San Francisco', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 2.5rem;
  color: #1e90ff;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: #666;
}

.search-input {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.post-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.post-item {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.post-item:hover {
  transform: translateY(-2px);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.post-header h2 {
  font-size: 1.2rem;
  margin: 0;
  color: #333;
}

.post-date {
  font-size: 0.9rem;
  color: #888;
}

.post-content {
  margin: 10px 0;
  color: #555;
}

.post-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.view-button {
  background-color: #17a2b8;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 0.9rem;
}

.view-button:hover {
  background-color: #138496;
}

.file-input {
  flex-grow: 1;
}

.attach-button {
  background-color: #6c757d;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 0.9rem;
}

.attach-button:hover {
  background-color: #5a6268;
}

.edit-button {
  background-color: #ffc107;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.edit-button:hover {
  background-color: #e0a800;
}

.delete-button {
  background-color: #dc3545;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.delete-button:hover {
  background-color: #c82333;
}

.add-button {
  display: block;
  width: 100%;
  padding: 10px;
  background-color: #1e90ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: background-color 0.3s;
}

.add-button:hover {
  background-color: #007acc;
}

.edit-form {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.edit-form h3 {
  margin-bottom: 10px;
}

.input,
.textarea {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
}

.save-button {
  background-color: #28a745;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.save-button:hover {
  background-color: #218838;
}

.cancel-button {
  background-color: #dc3545;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #c82333;
}

.no-posts {
  text-align: center;
  color: #777;
}
</style>
