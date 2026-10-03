# Gestion de Tâches & Projets — Intégration SOAP / REST

> **Projet d'examen — API SOAP : Intégration & Interopérabilité (SOAP / REST)**
>

Application moderne **Node.js / Express / MongoDB** enrichie d'un **client SOAP**
qui interroge un système patrimonial **Spring Boot** exposeant un contrat WSDL/XSD
strict. Les compétences et disponibilités des employés, gérées par l'ancien système
RH, sont synchronisées dans MongoDB pour piloter l'affectation des tâches.

---

## Table des matières

1. [Architecture](#1-architecture)
2. [Prérequis](#2-prérequis)
3. [Installation](#3-installation)
4. [Contrat SOAP (WSDL / XSD)](#4-contrat-soap-wsdl--xsd)
5. [Tests SOAP avec SoapUI](#5-tests-soap-avec-soapui)
6. [API REST — Ressource Employés](#6-api-rest--ressource-employés)
7. [Structure du projet](#7-structure-du-projet)


---

## 1. Architecture

Deux applications **distinctes** communiquent par SOAP. Le contrat XML reste
entièrement contenu dans le système legacy : l'application moderne ne connaît
que le WSDL.

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SYSTÈME LEGACY  (serveur SOAP)                     │
│                                                                        │
│   Spring Boot 3.4.1 · Java 21 · Spring-WS · Spring Data JPA · H2      │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  hr-service.xsd          contrat (généré -> classes JAXB)   │    │
│   │  HrServiceEndpoint       @Endpoint / @PayloadRoot           │    │
│   │  HrSoapFaultExceptionResolver  -> <soap:Fault>              │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                          ▲                                          │
│                          │  SOAP 1.1 — document/literal              │
│                          │  WSDL : /ws/hr-service.wsdl               │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           │  node-soap : soap.createClientAsync()
                           │  XML -> JSON -> Mongoose
┌──────────────────────────┼──────────────────────────────────────────┐
│                    APPLICATION MODERNE  (client SOAP)                │
│                          ▼                                          │
│   Node.js · Express 5 · Mongoose 9                                   │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  legacyHrClient.js  chargement WSDL, appel, <soap:Fault>     │    │
│   │  employeeService.js  upsert MongoDB (source : legacy-hr-soap) │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                          ▲                                          │
│                          │                                          │
│                   MongoDB  (27017)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Principe directeur (règle d'or du cahier des charges).** La couche SOAP est un
simple **adaptateur**. Elle ne duplique aucune logique métier : elle traduit
`XML → JSON`, puis délègue la persistance aux services et modèles Mongoose déjà
présents dans l'application.

| Couche | Fichiers | Responsabilité |
|---|---|---|
| Transport SOAP | `src/services/legacyHrClient.js` | charger le WSDL, appeler l'opération, traduire les `soap:Fault` |
| Synchronisation | `src/services/employeeService.js` | upsert des employés et de leurs compétences |
| Exposition REST | `src/controllers/employeeController.js` | filtrage, pagination, rapport de synchronisation |
| Persistance | `src/models/employee.js` | schéma Mongoose, sous-document `skills` |

---

## 2. Prérequis

| Composant | Version | Vérification |
|---|---|---|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| Java (JDK) | 21 | `java -version` |
| Maven | ≥ 3.9 | `mvn -v` |
| Docker Desktop | — | `docker -v` |
| SoapUI Open Source | 5.10+ | *(optionnel, pour la collection de tests)* |

---

## 3. Installation

### 3.1 Application moderne (Node.js)

```bash
cd "D:\Projet\GTP WEB(Projet de gestion taches en mongo)\GTPweb"
npm install
```

### 3.2 Système legacy (Spring Boot)

```bash
cd D:\Projet\ApiSOAPProject\legacy-hr-system
mvn clean package
```

Le JAR exécutable est produit dans `target\legacy-hr-system-1.0.0.jar`.
La base H2 est initialisée automatiquement à partir de `src/main/resources/data.sql`.






## 4. Contrat SOAP (WSDL / XSD)

Le contrat est la pièce maîtresse du projet (critère d'évaluation le plus lourd).
Il est décrit **une fois** dans `hr-service.xsd`, puis les classes Java sont
générées automatiquement par `jaxb2-maven-plugin` — aucune classe n'est écrite à la main.

**Namespace** : `http://upg.ac.rw/soap/hr`

### 4.1 Modèle relationnel reflété dans le XSD

| Table SQL | Colonne | Type XSD |
|---|---|---|
| `employee` | `employee_code` | `xs:string` |
| | `first_name`, `last_name` | `xs:string` |
| | `department` | `xs:string` |
| | `status` | `availabilityStatus` : `AVAILABLE` \| `ON_LEAVE` \| `BUSY` |
| `employee_skill` | `skill_name` | `skillName` |
| | `proficiency` | `proficiency` |



## 5. Tests SOAP avec SoapUI

Collection : [`soapui/legacy-hr-system.xml`](soapui/legacy-hr-system.xml)

| Élément | Valeur |
|---|---|
| Endpoint | `http://localhost:8080/ws` |
| Version SOAP | 1.1 — *document / literal* |
| Prérequis | le legacy doit tourner sur le port 8080 |

### Ouvrir la collection

> **File → Open Project…** puis sélectionner `soapui/legacy-hr-system.xml`
> (type **SoapUI Project** — *et non* « WSDL »).
>
> Fermer SoapUI **sans enregistrer** avant de régénérer le fichier : SoapUI
> réécrit le projet sur le disque à la fermeture.



Jouer une requête : double-cliquer sur l'opération, choisir la requête, puis
bouton **vert ▶ (Submit)**. La réponse XML s'affiche dans l'onglet **Response**.

Le dossier contient également une copie de référence du contrat
(`hr-service.wsdl`, `hr-service.xsd`) afin que la collection reste autonome.

---

## 6. API REST — Ressource Employés

Base : `http://localhost:5000/api/employees`

Toutes les routes exigent un jeton Bearer (`Authorization: Bearer <token>`).

| Méthode | Route | Rôle | Accès |
|---|---|---|---|
| `GET` | `/api/employees` | lister, filtrer, rechercher | authentifié |
| `GET` | `/api/employees/:employeeCode` | détail d'un employé + compétences | authentifié |
| `POST` | `/api/employees/sync` | synchroniser depuis le legacy | **admin** |
| `GET` | `/api/employees/sync/status` | état de la dernière synchronisation | **admin** |

### Filtres de `GET /api/employees`

| Paramètre | Effet |
|---|---|
| `?department=IT` | employés d'un département |
| `?available=true` | uniquement les employés `AVAILABLE` |
| `?search=alice` | recherche sur le code, le prénom, le nom |


## 7. Structure du projet

```
.
├── server.js                     point d'entrée HTTP
├── seed/seed.js                  jeu de données de démonstration
├── soapui/
│   ├── legacy-hr-system.xml      collection de tests SOAP
│   ├── hr-service.wsdl           copie de référence du contrat
│   └── hr-service.xsd
├── src/
│   ├── app.js                    configuration Express
│   ├── config/
│   │   ├── database.js           connexion Mongoose
│   │   └── soapConfig.js         URL du WSDL et délai d'attente
│   ├── models/employee.js        modèle Mongoose (compétences en sous-document)
│   ├── controllers/employeeController.js
│   ├── routes/employeeRoutes.js  authentification + rôles
│   ├── middlewares/
│   │   ├── authMiddleware.js     vérification du jeton JWT
│   │   └── roleMiddleware.js     contrôle d'accès par rôle
│   └── services/
│       ├── legacyHrClient.js     ★ adaptateur SOAP
│       └── employeeService.js    ★ synchronisation
└── frontend/                     interface (admin / chef-projet / employe)
```

Le système legacy, projet Maven distinct :

```
legacy-hr-system/
├── pom.xml
└── src/main/
    ├── java/com/upg/legacyhr/
    │   ├── soap/HrServiceEndpoint.java        @PayloadRoot
    │   ├── soap/EmployeeSoapMapper.java       entité SQL -> objets SOAP
    │   ├── soap/*Exception.java               exceptions métier
    │   ├── config/WebServiceConfig.java       DefaultWsdl11Definition
    │   ├── config/HrSoapFaultExceptionResolver.java
    │   ├── model/  repository/                Spring Data JPA
    └── resources/
        ├── schemas/hr-service.xsd            ★ le contrat
        └── data.sql                          jeu de données H2





