<script lang="ts">
import PouchDB from 'pouchdb'
import { ref } from 'vue'

export default {
  data() {
    return {
      total: 0,
      data: [] as any[],
      storage: null as PouchDB.Database | null,
    };
  },

  mounted() {
    this.initDatabase();
    this.fetchData();
  },

  methods: {
    fetchData() {
      const storage = ref(this.storage);
      const self = this;
      if (storage.value) {
        (storage.value).allDocs({
          include_docs: true,
          attachments: true
        }).then(function (result: any) {
          console.log('fetchData success', result);
          self.data = result.rows;
        }.bind(this)).catch(function (error: any) {
          console.log('fetchData error', error);
        });
      } else {
        console.log('nothing in storage');
      }
    },

    initDatabase() {
      const $storage = new PouchDB('http://admin:admin@localhost:5984/post');
      if ($storage) {
        console.log("Connected to collection 'post'");
      } else {
        console.warn("Something went wrong");
      }
      this.storage = $storage;
    }
  },

}
</script>

<template>
  <h1>Nombre de document : {{ data.length }}</h1>
  <ul>
    <li v-for="d in data" :key="d.id">
      {{ d }}
    </li>
  </ul>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}

.ucfirst:first-letter {
  text-transform: uppercase;

}
</style>
