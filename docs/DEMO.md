# Script de démo (environ 4 minutes)

## Avant de monter sur scène

- Deux profils de navigateur déjà connectés : un compte association (avec l'« Association de démonstration ») et un autre compte pour la bénévole. Aucun lien email à attendre pendant la démo.
- Le formulaire PDF de démo est prêt sur le bureau : `docs/demo/fiche-inscription-benevole.pdf` (2 pages, une trentaine de champs, 4 pièces à joindre).
- Une vidéo de secours de tout le parcours est enregistrée, au cas où le réseau ou une source de données tombe.
- Une recherche prend environ 20 secondes : c'est le moment de commenter ce qu'Aido fait en parallèle.

## Le problème (30 s)

> Des milliers de missions de bénévolat existent, mais les trouver est pénible : trop de choix, des compétences inutilisées, des engagements flous. Et quand on trouve, on tombe sur des sites d'associations difficiles à utiliser et des formulaires PDF à imprimer et signer. Les petites associations, elles, n'ont pas le temps de rédiger des annonces ni de trier les candidatures.

## Côté association (1 min 15)

1. **La vérification** (dans le profil bénévole, ou une fenêtre privée connectée à un compte sans association) : dans **Mon espace**, onglet **Association**, taper le RNA du Secours populaire français à Paris, `W751004625`, puis **Vérifier**. Aido interroge le registre officiel et affiche « Trouvée dans le registre officiel ». Ne pas confirmer : c'est seulement pour montrer la vérification.
   > Une association ne peut publier qu'après cette vérification. Pour la démo, on continue avec notre association de test.
2. **Publier une mission** (compte association) : déposer `fiche-inscription-benevole.pdf`, sans rien écrire. Montrer rapidement le PDF avant : état civil, pièce d'identité, justificatif de domicile, photo, signature.
3. Montrer le résultat (environ 10 s) : une annonce claire et **3 questions au lieu d'un formulaire de deux pages**. Aido ne demande ni adresse, ni date de naissance, ni pièce d'identité. Tout reste modifiable. Publier.
4. Le bandeau confirme que la mission apparaît déjà dans les recherches des bénévoles autour de Paris.

Si l'envoi du PDF échoue, coller ce texte à la place :
> On cherche des bénévoles le mardi soir 18h-21h pour la distribution alimentaire au 12 rue de la Roquette 75011. Pour postuler, remplir notre formulaire PDF (nom, adresse, date de naissance, copie de pièce d'identité, disponibilités, expériences, permis B, langues) et le renvoyer signé.

## Côté bénévole (1 min 45)

1. Dans le profil bénévole, ouvrir l'accueil et écrire :
   > Je m'appelle Camille, j'habite Paris 11e, je suis libre le mardi soir et j'aimerais aider pour de l'aide alimentaire.
2. Pendant la recherche (environ 20 s) : « Aido cherche en même temps dans les missions publiées sur Aido, sur JeVeuxAider et le Service Civique, et sur le web. Chaque lien trouvé sur le web est vérifié avant d'être affiché. »
3. Montrer :
   - les critères compris en étiquettes (supprimables) ;
   - la mission Aido **en premier**, avec « Candidature en 1 clic » ;
   - les missions JeVeuxAider et Service Civique, puis **« Aussi trouvé sur le web »** ;
   - la jauge d'engagement sur chaque carte.
4. Cliquer **Postuler sur Aido** : Aido sait déjà que Camille est libre le mardi soir et ne pose que les questions restantes. Répondre en une phrase, par exemple « dès le 4 novembre, et oui je peux porter des cartons ».
5. **La candidature est rédigée** : réponses et motivation, modifiables. Cliquer **Envoyer**.

## La boucle se ferme (30 s)

1. Compte association, ouvrir la mission : la candidature est là, avec le **résumé IA** de l'adéquation.
2. Accepter et écrire « Bienvenue, rendez-vous mardi à 18h ! ».
3. Profil bénévole, **Mon espace**, section **Mes candidatures** : statut Acceptée et le message.

## Pour finir (30 s)

- Données réelles : JeVeuxAider et Service Civique, plus la recherche web GPT, plus les missions publiées sur Aido.
- GPT à chaque étape : comprendre la personne, chercher sur le web, lire un PDF, rédiger la candidature, résumer l'adéquation pour l'association.
- Conçu pour tous les pays : un adaptateur par source de données, le reste ne change pas.
- Modèle économique : gratuit pour les bénévoles et les associations ; les entreprises paieront un abonnement pour le bénévolat de leurs salariés et le mécénat de compétences, déductible à 60 %. Sources dans le README.
- Prochaines étapes : clé API Engagement officielle, pages mission publiques à partager, rappels après acceptation, autres pays.

## Si le jury pose des questions

**Comment gagnez-vous de l'argent ?**
Les entreprises paient un abonnement annuel pour proposer des missions à leurs salariés (bénévolat, mécénat de compétences avec 60 % de réduction d'impôt, article 238 bis du CGI), avec un tableau de bord pour les RH. Ce marché existe déjà en France, Vendredi le montre. Plus tard : une offre premium pour les associations et des versions en marque blanche pour les collectivités.

**Pourquoi pas simplement JeVeuxAider ?**
JeVeuxAider est une source d'Aido, pas un concurrent. Aido réunit JeVeuxAider, le Service Civique, les missions publiées sur Aido et le web dans une seule conversation, et ajoute ce qui manque : la candidature sans formulaire.

**Comment savez-vous qu'une association est réelle ?**
Avant de publier, l'association donne son RNA ou son SIREN, et Aido le vérifie dans le registre officiel. Cela prouve que l'association existe et est active.

**Et les données personnelles ?**
Aido ne demande ni adresse, ni date de naissance, ni pièce d'identité quand ce n'est pas nécessaire. L'IA n'envoie jamais rien seule : le bénévole relit et clique lui-même.

**Pourquoi GPT ?**
GPT intervient à chaque étape : comprendre la personne, chercher sur le web, lire un PDF, rédiger la candidature, résumer l'adéquation pour l'association.
