let comment3 = {
  headers: {
    author: {
      name: 'octocat',
      login: 'octocat',
      timestamp: (new Date).valueOf()/1000 - 5,
    },
    parent: [ '898989' ]
  },
  sha: 'fjfjfjjff',
  message: `Iactavit Memnonis Latonam aptamque proles plangentibus tulit frustraque aera,
voco. Exteriusque utraque, ordine, fit dixerat inque. Abibat **effugit**.
`
}
let comment1 = {
  headers: {
    author: {
      name: 'octocat',
      login: 'octocat',
      timestamp: (new Date).valueOf()/1000 - 60*5,
    },
    parent: [ ]
  },
  sha: '898989',
  message: `Lorem *markdownum* amarunt et formae et mandataque tutae, lumina. Oculis in tene
excoquit audent, at caelebs capit, volat neque altum.

- Inachus tenui
- Fiducia nubemque
- Parte et illi inpositum Eurytus pectora funestaque

Et arbore, iners animae uberibus *fugit aequalis* vertice invictos
creator.`
}
let comment2 = {
  headers: {
    author: {
      name: 'octocat',
      login: 'octocat',
      timestamp: (new Date).valueOf()/1000 - 60*60*5,
    },
    parent: [ ]
  },
  sha: 'asdfasdf',
  message: `## Haud modo perque est

Cinyreius circum **generat** ad semper bracchia proles et
in? Cura est simul, refugitque congelat, pius.

    crossplatform_internal += bareMetal(menu(3 + 89));
    firewall *= 45;

Unam [infracto dixit](http://duobus.io/),
caelo [et](http://tenetaras.io/caraeque.html) speciem vincetis omnem concursibus
aera ego enim credas.
`
}
module.exports.comments = [ comment1, comment2, comment3 ]
