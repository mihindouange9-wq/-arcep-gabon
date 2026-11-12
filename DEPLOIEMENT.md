# Déploiement

Le site est un serveur Node : l'administration écrit des contenus et des fichiers sur le
disque. Il lui faut donc **un hébergement qui exécute Node 20 ou plus récent et conserve
un disque**, pas un hébergement de fichiers statiques.

Aucune installation : pas de `npm install`, pas de base de données. La commande de
démarrage est `npm start` (ou `node serveur/index.mjs`). Le processus lit `PORT` si la
plateforme l'impose, sinon `ARCEP_PORT` (4310).

## Option A : Render

Le dépôt contient `render.yaml` : Render y lit le service, la variable d'environnement et
le disque persistant. Render n'attache qu'un disque par service ; au démarrage,
`outils/deploiement/render.mjs` relie sur ce disque les contenus, les comptes,
l'historique, les demandes et les fichiers téléversés, puis lance le serveur.

1. Créer un dépôt sur GitHub et y pousser ce dossier (le `.gitignore` exclut ce qui ne
   doit pas partir : comptes, historique, demandes, captures, pages aspirées).
2. Sur render.com : **New → Blueprint**, choisir le dépôt, valider. Render crée le service
   `arcep-gabon`, la variable `ARCEP_SECURISE=1` et le disque de 2 Go monté sur
   `/var/data`. Le plan Starter est requis pour le disque.
3. Attendre la fin du déploiement, ouvrir l'adresse fournie, puis `/admin` : créer le
   premier compte administrateur.
4. Dans « Réglages et SEO » : renseigner l'adresse publique (`https://….onrender.com`).
   Laisser l'indexation décochée tant que l'ARCEP n'a pas validé la proposition.
5. Chaque `git push` redéploie le site ; les contenus et fichiers sur le disque sont
   conservés.

## Option B : serveur virtuel (OVH, Hetzner, Scaleway…)

1. Installer Node 20+, copier le dossier dans `/srv/arcep`, créer un utilisateur `arcep`.
2. Service système `/etc/systemd/system/arcep.service` :

```
[Unit]
Description=ARCEP Gabon
After=network.target

[Service]
WorkingDirectory=/srv/arcep
ExecStart=/usr/bin/node serveur/index.mjs
Environment=ARCEP_SECURISE=1
Environment=ARCEP_PORT=4310
Restart=always
User=arcep

[Install]
WantedBy=multi-user.target
```

   puis `systemctl enable --now arcep`.
3. Serveur frontal Caddy (`/etc/caddy/Caddyfile`), qui obtient le certificat HTTPS seul :

```
demo.votre-domaine.ga {
    reverse_proxy 127.0.0.1:4310
}
```

4. Ouvrir `/admin`, créer le premier compte, renseigner l'adresse publique dans les réglages.
5. Sauvegarder régulièrement `donnees/`, `public/assets/medias/`, `public/assets/documents/`.

## Nom de domaine

Le site doit répondre sous une adresse à lui, avec un certificat HTTPS.

1. **Choisir le nom.** Le domaine définitif est `arcep.ga`, propriété de l'Autorité : au
   moment du basculement, c'est l'ARCEP qui fera pointer son domaine vers l'hébergement
   (voir l'étape 4, à faire depuis le compte de son registrar). Pour la présentation, prendre
   un nom à vous : `arcep-gabon.com`, `arcepgabon.com` ou un sous-domaine d'un domaine que
   vous possédez déjà (`arcep.votre-agence.com`).
2. **Acheter le nom** chez un registrar (OVH, Gandi, Namecheap, Cloudflare Registrar : de
   10 à 15 € par an pour un `.com`). Les `.ga` se réservent auprès des registrars accrédités
   par le registre gabonais.
3. **Déclarer le domaine sur Render** : service `arcep-gabon` → « Settings » → « Custom
   Domains » → « Add ». Render affiche l'enregistrement DNS à créer.
4. **Créer l'enregistrement DNS** chez le registrar (zone DNS du domaine) :
   - pour un sous-domaine (`www.arcep-gabon.com`) : un enregistrement `CNAME` vers
     `arcep-gabon-xxxx.onrender.com` ;
   - pour le domaine nu (`arcep-gabon.com`) : l'enregistrement `A` ou `ALIAS` que Render
     indique. Render redirige le nu vers `www` si on le lui demande.
   La propagation prend de quelques minutes à quelques heures.
5. **HTTPS** : Render obtient et renouvelle le certificat automatiquement dès que le DNS
   pointe vers lui. Rien à installer.
6. **Dans l'administration** : « Réglages et SEO » → « Adresse publique du site » =
   `https://www.arcep-gabon.com`, puis, le jour de la mise en service, cocher
   « Autoriser l'indexation ». Les adresses canoniques, le plan du site et les cartes de
   partage utilisent cette adresse.
7. **Sur un serveur virtuel** (option B), le même DNS pointe vers l'adresse IP du serveur
   (`A`), et Caddy obtient le certificat seul.

## Dans les deux cas

- Le formulaire de contact enregistre les demandes dans `donnees/demandes.jsonl` sans
  envoyer de courriel.
- Après une modification du site, refaire la vidéo de l'iPhone :
  `node outils/charte/video-iphone.mjs` (serveur lancé).
- Contrôle après mise en ligne : `node outils/controle/verif.mjs https://votre-adresse`.
