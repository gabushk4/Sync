let enGeneration = false
let queue = []

function genererSlug(titre='evenement sans titre', suffixeUnique){
    const slug = titre
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0,50);
    return suffixeUnique ? `${slug}-${suffixeUnique}` : slug;
}

async function processQueue() {
  if (enGeneration) return
  enGeneration = true
  while (queue.length > 0) {
    const task = queue.shift()
    await task()
  }
  enGeneration = false
}

export default async function genererSlugAvecQueue(titre='evenement sans titre', suffixeUnique){
    return new Promise((resolve) => {
    queue.push(async () => {
      const id = genererSlug(titre, suffixeUnique)
      resolve(id)
    })
    processQueue()
  })
}