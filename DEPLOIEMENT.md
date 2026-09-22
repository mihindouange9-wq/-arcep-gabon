# Déploiement

Le site est un serveur Node : l'administration écrit des contenus et des fichiers sur le
disque. Il lui faut donc **un hébergement qui exécute Node 20 ou plus récent et conserve
un disque** — pas un hébergement de fichiers statiques.

Aucune installation : pas de `npm install`, pas de base de données. La commande de
démarrage est `npm start` (ou `node serveur/index.mjs`). Le processus lit `PORT` si la
plateforme l'impose, sinon `ARCEP_PORT` (4310).

## Option A — Render

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

## Option B — serveur virtuel (OVH, Hetzner, Scaleway…)

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

## Dans les deux cas

- Le domaine `arcep.ga` appartient à l'Autorité : pour la présentation, employer un
  sous-domaine à vous ou l'adresse fournie par la plateforme.
- Le formulaire de contact enregistre les demandes dans `donnees/demandes.jsonl` sans
  envoyer de courriel.
- Après une modification du site, refaire la vidéo de l'iPhone :
  `node outils/charte/video-iphone.mjs` (serveur lancé).
- Contrôle après mise en ligne : `node outils/controle/verif.mjs https://votre-adresse`.
