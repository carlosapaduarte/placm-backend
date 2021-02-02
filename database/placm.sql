drop database if exists placmdb;
create schema placmdb default character set utf8mb4;
-- CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
grant all privileges on placmdb.* to 'user'@'localhost';
flush privileges;
use placmdb;

CREATE TABLE `Rule` (
  `RuleId` int NOT NULL AUTO_INCREMENT,
  `Mapping` varchar(10) NOT NULL,
  `Name` varchar(255) NOT NULL,
  `Url` text NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`RuleId`),
  UNIQUE KEY `Mapping_UNIQUE` (`Mapping`)
  -- UNIQUE KEY `Url_idx` (`Url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ElementType` (
  `TypeId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  PRIMARY KEY (`TypeId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `RuleElementType` (
  `RuleId` int NOT NULL,
  `TypeId` int NOT NULL,
  PRIMARY KEY (`RuleId`,`TypeId`),
  CONSTRAINT `Rule_ET_fk` FOREIGN KEY (`RuleId`) REFERENCES `Rule` (`RuleId`) ON DELETE CASCADE,
  CONSTRAINT `ElemType_Rule_fk` FOREIGN KEY (`TypeId`) REFERENCES `ElementType` (`TypeId`) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `SuccessCriteria` (
  `SCId` varchar(10) NOT NULL,
  `Name` varchar(255) NOT NULL,
  `Principle` varchar(255) NOT NULL,
  `Level` varchar(3) NOT NULL,
  `Url` text NOT NULL,
  PRIMARY KEY (`SCId`),  
  UNIQUE KEY `Name_UNIQUE` (`Name`)
  -- UNIQUE KEY `Url_idx` (`Url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `EvaluationTool` (
  `EvaluationToolId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  `Url` text DEFAULT NULL,
  `Description` varchar(255) DEFAULT NULL,
  `Version` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`EvaluationToolId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
  -- UNIQUE KEY `Url_UNIQUE` (`Url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AutomaticEvaluation` (
  `AutoEvalId` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(255),
  `Date` datetime,
  `Url` text,
  `PagesNumber` int,
  `Summary` varchar(255),
  `EvaluationToolId` int NOT NULL,
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`AutoEvalId`),
  KEY `EvaluationToolId_fk_idx` (`EvaluationToolId`),
  CONSTRAINT `EvaluationTool_AE_fk` FOREIGN KEY (`EvaluationToolId`) REFERENCES `EvaluationTool` (`EvaluationToolId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ManualEvaluation` (
  `ManualEvalId` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(255),
  `Date` datetime,
  `Url` text,
  `PagesNumber` int,
  `SatisfiedHeuristics` int,
  `ApplicableHeuristics` int,
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`ManualEvalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `UsabilityTest` (
  `UsabTestId` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(255),
  `Date` datetime,
  `Url` text,
  `PagesNumber` int,
  -- participants em string ou int ???? --
  `Participants` varchar(255),
  `Tanks` varchar(255),
  `Summary` varchar(255),
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`UsabTestId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Tag` (
  `TagId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  PRIMARY KEY (`TagId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Contact` (
  `ContactId` int NOT NULL AUTO_INCREMENT,
  `Type` varchar(255),
  `Contact` varchar(255),
  `DurationResponse` varchar(255),
  PRIMARY KEY (`ContactId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Continent` (
  `ContinentId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  PRIMARY KEY (`ContinentId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Country` (
  `CountryId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  `ContinentId` int NOT NULL,
  PRIMARY KEY (`CountryId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`),
  KEY `ContinentId_fk_idx` (`ContinentId`),
  CONSTRAINT `ContinentId` FOREIGN KEY (`ContinentId`) REFERENCES `Continent` (`ContinentId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Organization` (
  `OrganizationId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  `ShortName` varchar(255),
  PRIMARY KEY (`OrganizationId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Application` (
  `ApplicationId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  -- `ShortName` varchar(255),
  `OrganizationId` int NOT NULL,
  -- 0 website, 1 app
  `Type` tinyint NOT NULL DEFAULT 0,
  -- 0 public, 1 private
  `Sector` tinyint,
  `Url` text,
  `CreationDate` datetime NOT NULL,
  `CountryId` int,
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`ApplicationId`),
  -- UNIQUE KEY `Url_UNIQUE` (`Url`),
  KEY `CountryId_fk_idx` (`CountryId`),
  CONSTRAINT `OrganizationId_fk` FOREIGN KEY (`OrganizationId`) REFERENCES `Organization` (`OrganizationId`) ON DELETE CASCADE,
  CONSTRAINT `CountryId_fk` FOREIGN KEY (`CountryId`) REFERENCES `Country` (`CountryId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Page` (
  `PageId` int NOT NULL AUTO_INCREMENT,
  `Url` text NOT NULL,
  `CreationDate` datetime NOT NULL,
  `ApplicationId` int NOT NULL,
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`PageId`),
  -- UNIQUE KEY `Url_UNIQUE` (`Url`),
  KEY `ApplicationId_fk_idx` (`ApplicationId`),
  CONSTRAINT `ApplicationId_fk` FOREIGN KEY (`ApplicationId`) REFERENCES `Application` (`ApplicationId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Assertion` (
  `AssertionId` int NOT NULL AUTO_INCREMENT,
  `EvaluationToolId` int NOT NULL,
  `RuleId` int NOT NULL,
  `PageId` int NOT NULL,
  `Mode` enum('automatic','manual', 'semiAuto','undisclosed','unknownMode') NOT NULL,
  `Date` datetime NOT NULL,
  `Description` varchar(255),
  `Outcome` enum('passed','failed','cantTell','inapplicable','untested') NOT NULL,
  -- `TestedUrl` varchar(255) NOT NULL,
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`AssertionId`),
  -- KEY `TestedUrl_idx` (`TestedUrl`),
  KEY `EvaluationToolId_fk_idx` (`EvaluationToolId`),
  KEY `RuleId_fk_idx` (`RuleId`),
  KEY `PageId_fk_idx` (`PageId`),
  CONSTRAINT `EvaluationToolId_fk` FOREIGN KEY (`EvaluationToolId`) REFERENCES `EvaluationTool` (`EvaluationToolId`) ON DELETE CASCADE,
  CONSTRAINT `RuleId_fk` FOREIGN KEY (`RuleId`) REFERENCES `Rule` (`RuleId`) ON DELETE CASCADE,
  CONSTRAINT `PageId_fk` FOREIGN KEY (`PageId`) REFERENCES `Page` (`PageId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AccessibilityStatement` (
  `ASId` int NOT NULL AUTO_INCREMENT,
  `Origin` varchar(255) NOT NULL,
  `ApplicationId` int NOT NULL,
  -- `Name` varchar(255) NOT NULL,
  `Standard` enum('2.0','2.1','other','unknown') NOT NULL,
  `Date` datetime NOT NULL,
  -- 0 not assessed, 1 non conformant, 2 partially conformant, 3 fully conformant
  `State` enum('0','1','2','3') NOT NULL,
  `ASUrl` text,
  -- 0 none, 1 bronze, 2 prata, 3 ouro
  `UsabilityStamp` enum('0','1','2','3'), --pt
  `UsabilityStampText` varchar(255), --pt
  `EffortsCounter` int, --pt
  `LimitationsWithAltCounter` int, --pt
  `LimitationsWithoutAltCounter` int,
  `CompatabilitiesCounter` int, --w3
  `IncompatabilitiesCounter` int, --w3
  `TechnologiesUsed` varchar(255), --w3
  -- 0 other, 1 internal, 2 external
  `AccessmentApproach` varchar(3) NOT NULL DEFAULT '000', --w3
  `Deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`ASId`),
  -- UNIQUE KEY `ASUrl_UNIQUE` (`ASUrl`),
  CONSTRAINT `Application_AS_fk` FOREIGN KEY (`ApplicationId`) REFERENCES `Application` (`ApplicationId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

 CREATE TABLE `ScorePage` (
  `PageId` int NOT NULL,
  `Score` decimal(4,1) NOT NULL,
  `Date` datetime NOT NULL,
  PRIMARY KEY (`PageId`),
  CONSTRAINT `PageId_Score_fk` FOREIGN KEY (`PageId`) REFERENCES `Page` (`PageId`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AcceStatUsabTest` (
  `ASId` int NOT NULL,
  `UsabTestId` int NOT NULL,
  PRIMARY KEY (`ASId`,`UsabTestId`),
  CONSTRAINT `AS_UT_fk` FOREIGN KEY (`ASId`) REFERENCES `AccessibilityStatement` (`ASId`) ON DELETE CASCADE,
  CONSTRAINT `UsabTest_AS_fk` FOREIGN KEY (`UsabTestId`) REFERENCES `UsabilityTest` (`UsabTestId`) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AcceStatManualEval` (
  `ASId` int NOT NULL,
  `ManualEvalId` int NOT NULL,
  PRIMARY KEY (`ASId`,`ManualEvalId`),
  CONSTRAINT `AS_ME_fk` FOREIGN KEY (`ASId`) REFERENCES `AccessibilityStatement` (`ASId`) ON DELETE CASCADE,
  CONSTRAINT `ManualEval_AS_fk` FOREIGN KEY (`ManualEvalId`) REFERENCES `ManualEvaluation` (`ManualEvalId`) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AcceStatAutoEval` (
  `ASId` int NOT NULL,
  `AutoEvalId` int NOT NULL,
  PRIMARY KEY (`ASId`,`AutoEvalId`),
  CONSTRAINT `AS_AE_fk` FOREIGN KEY (`ASId`) REFERENCES `AccessibilityStatement` (`ASId`) ON DELETE CASCADE,
  CONSTRAINT `AutoEval_AS_fk` FOREIGN KEY (`AutoEvalId`) REFERENCES `AutomaticEvaluation` (`AutoEvalId`) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AcceStatContact` (
  `ASId` int NOT NULL,
  `ContactId` int NOT NULL,
  PRIMARY KEY (`ASId`,`ContactId`),
  CONSTRAINT `ContactId_AS_fk` FOREIGN KEY (`ContactId`) REFERENCES `Contact` (`ContactId`) ON DELETE CASCADE,
  CONSTRAINT `AS_Contact_fk` FOREIGN KEY (`ASId`) REFERENCES `AccessibilityStatement` (`ASId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `AssertionAutoEval` (
  `AssertionId` int NOT NULL,
  `AutoEvalId` int NOT NULL,
  PRIMARY KEY (`AssertionId`,`AutoEvalId`),
  CONSTRAINT `Assertion_AE_fk` FOREIGN KEY (`AssertionId`) REFERENCES `Assertion` (`AssertionId`) ON DELETE CASCADE,
  CONSTRAINT `AutoEval_Assert_fk` FOREIGN KEY (`AutoEvalId`) REFERENCES `AutomaticEvaluation` (`AutoEvalId`) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `TagApplication` (
  `TagId` int NOT NULL,
  `ApplicationId` int NOT NULL,
  PRIMARY KEY (`TagId`,`ApplicationId`),
  CONSTRAINT `Tag_App_fk` FOREIGN KEY (`TagId`) REFERENCES `Tag` (`TagId`) ON DELETE CASCADE,
  CONSTRAINT `Application_Tag_fk` FOREIGN KEY (`ApplicationId`) REFERENCES `Application` (`ApplicationId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `RuleSuccessCriteria` (
  `RuleId` int NOT NULL,
  `SCId` varchar(10) NOT NULL,
  PRIMARY KEY (`RuleId`,`SCId`),
  CONSTRAINT `Rule_SuccessCriteria_fk` FOREIGN KEY (`RuleId`) REFERENCES `Rule` (`RuleId`) ON DELETE CASCADE,
  CONSTRAINT `SuccessCriteria_Rule_fk` FOREIGN KEY (`SCId`) REFERENCES `SuccessCriteria` (`SCId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*INSERT INTO Continent (name) VALUES ('Asia');
INSERT INTO Country (name, continentId) VALUES ('Afghanistan', 1);
INSERT INTO Continent (name) VALUES ('Europe');
INSERT INTO Country (name, continentId) VALUES ('Albania', 2);
INSERT INTO Continent (name) VALUES ('Africa');
INSERT INTO Country (name, continentId) VALUES ('Algeria', 3);
INSERT INTO Continent (name) VALUES ('Oceania');
INSERT INTO Country (name, continentId) VALUES ('American Samoa', 4);
INSERT INTO Country (name, continentId) VALUES ('Andorra', 2);
INSERT INTO Country (name, continentId) VALUES ('Angola', 3);
INSERT INTO Continent (name) VALUES ('North America');
INSERT INTO Country (name, continentId) VALUES ('Anguilla', 5);
INSERT INTO Continent (name) VALUES ('Antarctica');
INSERT INTO Country (name, continentId) VALUES ('Antarctica', 6);
INSERT INTO Country (name, continentId) VALUES ('Antigua and Barbuda', 5);
INSERT INTO Continent (name) VALUES ('South America');
INSERT INTO Country (name, continentId) VALUES ('Argentina', 7);
INSERT INTO Country (name, continentId) VALUES ('Armenia', 1);
INSERT INTO Country (name, continentId) VALUES ('Aruba', 5);
INSERT INTO Country (name, continentId) VALUES ('Australia', 4);
INSERT INTO Country (name, continentId) VALUES ('Austria', 2);
INSERT INTO Country (name, continentId) VALUES ('Azerbaijan', 1);
INSERT INTO Country (name, continentId) VALUES ('Bahamas', 5);
INSERT INTO Country (name, continentId) VALUES ('Bahrain', 1);
INSERT INTO Country (name, continentId) VALUES ('Bangladesh', 1);
INSERT INTO Country (name, continentId) VALUES ('Barbados', 5);
INSERT INTO Country (name, continentId) VALUES ('Belarus', 2);
INSERT INTO Country (name, continentId) VALUES ('Belgium', 2);
INSERT INTO Country (name, continentId) VALUES ('Belize', 5);
INSERT INTO Country (name, continentId) VALUES ('Benin', 3);
INSERT INTO Country (name, continentId) VALUES ('Bermuda', 5);
INSERT INTO Country (name, continentId) VALUES ('Bhutan', 1);
INSERT INTO Country (name, continentId) VALUES ('Bolivia', 7);
INSERT INTO Country (name, continentId) VALUES ('Bosnia and Herzegovina', 2);
INSERT INTO Country (name, continentId) VALUES ('Botswana', 3);
INSERT INTO Country (name, continentId) VALUES ('Bouvet Island', 6);
INSERT INTO Country (name, continentId) VALUES ('Brazil', 7);
INSERT INTO Country (name, continentId) VALUES ('British Indian Ocean Territory', 3);
INSERT INTO Country (name, continentId) VALUES ('Brunei', 1);
INSERT INTO Country (name, continentId) VALUES ('Bulgaria', 2);
INSERT INTO Country (name, continentId) VALUES ('Burkina Faso', 3);
INSERT INTO Country (name, continentId) VALUES ('Burundi', 3);
INSERT INTO Country (name, continentId) VALUES ('Cambodia', 1);
INSERT INTO Country (name, continentId) VALUES ('Cameroon', 3);
INSERT INTO Country (name, continentId) VALUES ('Canada', 5);
INSERT INTO Country (name, continentId) VALUES ('Cape Verde', 3);
INSERT INTO Country (name, continentId) VALUES ('Cayman Islands', 5);
INSERT INTO Country (name, continentId) VALUES ('Central African Republic', 3);
INSERT INTO Country (name, continentId) VALUES ('Chad', 3);
INSERT INTO Country (name, continentId) VALUES ('Chile', 7);
INSERT INTO Country (name, continentId) VALUES ('China', 1);
INSERT INTO Country (name, continentId) VALUES ('Christmas Island', 4);
INSERT INTO Country (name, continentId) VALUES ('Cocos (Keeling) Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Colombia', 7);
INSERT INTO Country (name, continentId) VALUES ('Comoros', 3);
INSERT INTO Country (name, continentId) VALUES ('Congo', 3);
INSERT INTO Country (name, continentId) VALUES ('Cook Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Costa Rica', 5);
INSERT INTO Country (name, continentId) VALUES ('Croatia', 2);
INSERT INTO Country (name, continentId) VALUES ('Cuba', 5);
INSERT INTO Country (name, continentId) VALUES ('Cyprus', 1);
INSERT INTO Country (name, continentId) VALUES ('Czech Republic', 2);
INSERT INTO Country (name, continentId) VALUES ('Denmark', 2);
INSERT INTO Country (name, continentId) VALUES ('Djibouti', 3);
INSERT INTO Country (name, continentId) VALUES ('Dominica', 5);
INSERT INTO Country (name, continentId) VALUES ('Dominican Republic', 5);
INSERT INTO Country (name, continentId) VALUES ('East Timor', 1);
INSERT INTO Country (name, continentId) VALUES ('Ecuador', 7);
INSERT INTO Country (name, continentId) VALUES ('Egypt', 3);
INSERT INTO Country (name, continentId) VALUES ('El Salvador', 5);
INSERT INTO Country (name, continentId) VALUES ('England', 2);
INSERT INTO Country (name, continentId) VALUES ('Equatorial Guinea', 3);
INSERT INTO Country (name, continentId) VALUES ('Eritrea', 3);
INSERT INTO Country (name, continentId) VALUES ('Estonia', 2);
INSERT INTO Country (name, continentId) VALUES ('Ethiopia', 3);
INSERT INTO Country (name, continentId) VALUES ('Falkland Islands', 7);
INSERT INTO Country (name, continentId) VALUES ('Faroe Islands', 2);
INSERT INTO Country (name, continentId) VALUES ('Fiji Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Finland', 2);
INSERT INTO Country (name, continentId) VALUES ('France', 2);
INSERT INTO Country (name, continentId) VALUES ('French Guiana', 7);
INSERT INTO Country (name, continentId) VALUES ('French Polynesia', 4);
INSERT INTO Country (name, continentId) VALUES ('French Southern territories', 6);
INSERT INTO Country (name, continentId) VALUES ('Gabon', 3);
INSERT INTO Country (name, continentId) VALUES ('Gambia', 3);
INSERT INTO Country (name, continentId) VALUES ('Georgia', 1);
INSERT INTO Country (name, continentId) VALUES ('Germany', 2);
INSERT INTO Country (name, continentId) VALUES ('Ghana', 3);
INSERT INTO Country (name, continentId) VALUES ('Gibraltar', 2);
INSERT INTO Country (name, continentId) VALUES ('Greece', 2);
INSERT INTO Country (name, continentId) VALUES ('Greenland', 5);
INSERT INTO Country (name, continentId) VALUES ('Grenada', 5);
INSERT INTO Country (name, continentId) VALUES ('Guadeloupe', 5);
INSERT INTO Country (name, continentId) VALUES ('Guam', 4);
INSERT INTO Country (name, continentId) VALUES ('Guatemala', 5);
INSERT INTO Country (name, continentId) VALUES ('Guinea', 3);
INSERT INTO Country (name, continentId) VALUES ('Guinea-Bissau', 3);
INSERT INTO Country (name, continentId) VALUES ('Guyana', 7);
INSERT INTO Country (name, continentId) VALUES ('Haiti', 5);
INSERT INTO Country (name, continentId) VALUES ('Heard Island and McDonald Islands', 6);
INSERT INTO Country (name, continentId) VALUES ('Holy See (Vatican City State)', 2);
INSERT INTO Country (name, continentId) VALUES ('Honduras', 5);
INSERT INTO Country (name, continentId) VALUES ('Hong Kong', 1);
INSERT INTO Country (name, continentId) VALUES ('Hungary', 2);
INSERT INTO Country (name, continentId) VALUES ('Iceland', 2);
INSERT INTO Country (name, continentId) VALUES ('India', 1);
INSERT INTO Country (name, continentId) VALUES ('Indonesia', 1);
INSERT INTO Country (name, continentId) VALUES ('Iran', 1);
INSERT INTO Country (name, continentId) VALUES ('Iraq', 1);
INSERT INTO Country (name, continentId) VALUES ('Ireland', 2);
INSERT INTO Country (name, continentId) VALUES ('Israel', 1);
INSERT INTO Country (name, continentId) VALUES ('Italy', 2);
INSERT INTO Country (name, continentId) VALUES ('Ivory Coast', 3);
INSERT INTO Country (name, continentId) VALUES ('Jamaica', 5);
INSERT INTO Country (name, continentId) VALUES ('Japan', 1);
INSERT INTO Country (name, continentId) VALUES ('Jordan', 1);
INSERT INTO Country (name, continentId) VALUES ('Kazakhstan', 1);
INSERT INTO Country (name, continentId) VALUES ('Kenya', 3);
INSERT INTO Country (name, continentId) VALUES ('Kiribati', 4);
INSERT INTO Country (name, continentId) VALUES ('Kuwait', 1);
INSERT INTO Country (name, continentId) VALUES ('Kyrgyzstan', 1);
INSERT INTO Country (name, continentId) VALUES ('Laos', 1);
INSERT INTO Country (name, continentId) VALUES ('Latvia', 2);
INSERT INTO Country (name, continentId) VALUES ('Lebanon', 1);
INSERT INTO Country (name, continentId) VALUES ('Lesotho', 3);
INSERT INTO Country (name, continentId) VALUES ('Liberia', 3);
INSERT INTO Country (name, continentId) VALUES ('Libyan Arab Jamahiriya', 3);
INSERT INTO Country (name, continentId) VALUES ('Liechtenstein', 2);
INSERT INTO Country (name, continentId) VALUES ('Lithuania', 2);
INSERT INTO Country (name, continentId) VALUES ('Luxembourg', 2);
INSERT INTO Country (name, continentId) VALUES ('Macao', 1);
INSERT INTO Country (name, continentId) VALUES ('North Macedonia', 2);
INSERT INTO Country (name, continentId) VALUES ('Madagascar', 3);
INSERT INTO Country (name, continentId) VALUES ('Malawi', 3);
INSERT INTO Country (name, continentId) VALUES ('Malaysia', 1);
INSERT INTO Country (name, continentId) VALUES ('Maldives', 1);
INSERT INTO Country (name, continentId) VALUES ('Mali', 3);
INSERT INTO Country (name, continentId) VALUES ('Malta', 2);
INSERT INTO Country (name, continentId) VALUES ('Marshall Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Martinique', 5);
INSERT INTO Country (name, continentId) VALUES ('Mauritania', 3);
INSERT INTO Country (name, continentId) VALUES ('Mauritius', 3);
INSERT INTO Country (name, continentId) VALUES ('Mayotte', 3);
INSERT INTO Country (name, continentId) VALUES ('Mexico', 5);
INSERT INTO Country (name, continentId) VALUES ('Micronesia, Federated States of', 4);
INSERT INTO Country (name, continentId) VALUES ('Moldova', 2);
INSERT INTO Country (name, continentId) VALUES ('Monaco', 2);
INSERT INTO Country (name, continentId) VALUES ('Mongolia', 1);
INSERT INTO Country (name, continentId) VALUES ('Montserrat', 5);
INSERT INTO Country (name, continentId) VALUES ('Morocco', 3);
INSERT INTO Country (name, continentId) VALUES ('Mozambique', 3);
INSERT INTO Country (name, continentId) VALUES ('Myanmar', 1);
INSERT INTO Country (name, continentId) VALUES ('Namibia', 3);
INSERT INTO Country (name, continentId) VALUES ('Nauru', 4);
INSERT INTO Country (name, continentId) VALUES ('Nepal', 1);
INSERT INTO Country (name, continentId) VALUES ('Netherlands', 2);
INSERT INTO Country (name, continentId) VALUES ('Netherlands Antilles', 5);
INSERT INTO Country (name, continentId) VALUES ('New Caledonia', 4);
INSERT INTO Country (name, continentId) VALUES ('New Zealand', 4);
INSERT INTO Country (name, continentId) VALUES ('Nicaragua', 5);
INSERT INTO Country (name, continentId) VALUES ('Niger', 3);
INSERT INTO Country (name, continentId) VALUES ('Nigeria', 3);
INSERT INTO Country (name, continentId) VALUES ('Niue', 4);
INSERT INTO Country (name, continentId) VALUES ('Norfolk Island', 4);
INSERT INTO Country (name, continentId) VALUES ('North Korea', 1);
INSERT INTO Country (name, continentId) VALUES ('Northern Ireland', 2);
INSERT INTO Country (name, continentId) VALUES ('Northern Mariana Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Norway', 2);
INSERT INTO Country (name, continentId) VALUES ('Oman', 1);
INSERT INTO Country (name, continentId) VALUES ('Pakistan', 1);
INSERT INTO Country (name, continentId) VALUES ('Palau', 4);
INSERT INTO Country (name, continentId) VALUES ('Palestine', 1);
INSERT INTO Country (name, continentId) VALUES ('Panama', 5);
INSERT INTO Country (name, continentId) VALUES ('Papua New Guinea', 4);
INSERT INTO Country (name, continentId) VALUES ('Paraguay', 7);
INSERT INTO Country (name, continentId) VALUES ('Peru', 7);
INSERT INTO Country (name, continentId) VALUES ('Philippines', 1);
INSERT INTO Country (name, continentId) VALUES ('Pitcairn', 4);
INSERT INTO Country (name, continentId) VALUES ('Poland', 2);
INSERT INTO Country (name, continentId) VALUES ('Portugal', 2);
INSERT INTO Country (name, continentId) VALUES ('Puerto Rico', 5);
INSERT INTO Country (name, continentId) VALUES ('Qatar', 1);
INSERT INTO Country (name, continentId) VALUES ('Reunion', 3);
INSERT INTO Country (name, continentId) VALUES ('Romania', 2);
INSERT INTO Country (name, continentId) VALUES ('Russian Federation', 2);
INSERT INTO Country (name, continentId) VALUES ('Rwanda', 3);
INSERT INTO Country (name, continentId) VALUES ('Saint Helena', 3);
INSERT INTO Country (name, continentId) VALUES ('Saint Kitts and Nevis', 5);
INSERT INTO Country (name, continentId) VALUES ('Saint Lucia', 5);
INSERT INTO Country (name, continentId) VALUES ('Saint Pierre and Miquelon', 5);
INSERT INTO Country (name, continentId) VALUES ('Saint Vincent and the Grenadines', 5);
INSERT INTO Country (name, continentId) VALUES ('Samoa', 4);
INSERT INTO Country (name, continentId) VALUES ('San Marino', 2);
INSERT INTO Country (name, continentId) VALUES ('Sao Tome and Principe', 3);
INSERT INTO Country (name, continentId) VALUES ('Saudi Arabia', 1);
INSERT INTO Country (name, continentId) VALUES ('Scotland', 2);
INSERT INTO Country (name, continentId) VALUES ('Senegal', 3);
INSERT INTO Country (name, continentId) VALUES ('Seychelles', 3);
INSERT INTO Country (name, continentId) VALUES ('Sierra Leone', 3);
INSERT INTO Country (name, continentId) VALUES ('Singapore', 1);
INSERT INTO Country (name, continentId) VALUES ('Slovakia', 2);
INSERT INTO Country (name, continentId) VALUES ('Slovenia', 2);
INSERT INTO Country (name, continentId) VALUES ('Solomon Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Somalia', 3);
INSERT INTO Country (name, continentId) VALUES ('South Africa', 3);
INSERT INTO Country (name, continentId) VALUES ('South Georgia and the South Sandwich Islands', 6);
INSERT INTO Country (name, continentId) VALUES ('South Korea', 1);
INSERT INTO Country (name, continentId) VALUES ('South Sudan', 3);
INSERT INTO Country (name, continentId) VALUES ('Spain', 2);
INSERT INTO Country (name, continentId) VALUES ('Sri Lanka', 1);
INSERT INTO Country (name, continentId) VALUES ('Sudan', 3);
INSERT INTO Country (name, continentId) VALUES ('Suriname', 7);
INSERT INTO Country (name, continentId) VALUES ('Svalbard and Jan Mayen', 2);
INSERT INTO Country (name, continentId) VALUES ('Swaziland', 3);
INSERT INTO Country (name, continentId) VALUES ('Sweden', 2);
INSERT INTO Country (name, continentId) VALUES ('Switzerland', 2);
INSERT INTO Country (name, continentId) VALUES ('Syria', 1);
INSERT INTO Country (name, continentId) VALUES ('Tajikistan', 1);
INSERT INTO Country (name, continentId) VALUES ('Tanzania', 3);
INSERT INTO Country (name, continentId) VALUES ('Thailand', 1);
INSERT INTO Country (name, continentId) VALUES ('The Democratic Republic of Congo', 3);
INSERT INTO Country (name, continentId) VALUES ('Togo', 3);
INSERT INTO Country (name, continentId) VALUES ('Tokelau', 4);
INSERT INTO Country (name, continentId) VALUES ('Tonga', 4);
INSERT INTO Country (name, continentId) VALUES ('Trinidad and Tobago', 5);
INSERT INTO Country (name, continentId) VALUES ('Tunisia', 3);
INSERT INTO Country (name, continentId) VALUES ('Turkey', 1);
INSERT INTO Country (name, continentId) VALUES ('Turkmenistan', 1);
INSERT INTO Country (name, continentId) VALUES ('Turks and Caicos Islands', 5);
INSERT INTO Country (name, continentId) VALUES ('Tuvalu', 4);
INSERT INTO Country (name, continentId) VALUES ('Uganda', 3);
INSERT INTO Country (name, continentId) VALUES ('Ukraine', 2);
INSERT INTO Country (name, continentId) VALUES ('United Arab Emirates', 1);
INSERT INTO Country (name, continentId) VALUES ('United Kingdom', 2);
INSERT INTO Country (name, continentId) VALUES ('United States', 5);
INSERT INTO Country (name, continentId) VALUES ('United States Minor Outlying Islands', 4);
INSERT INTO Country (name, continentId) VALUES ('Uruguay', 7);
INSERT INTO Country (name, continentId) VALUES ('Uzbekistan', 1);
INSERT INTO Country (name, continentId) VALUES ('Vanuatu', 4);
INSERT INTO Country (name, continentId) VALUES ('Venezuela', 7);
INSERT INTO Country (name, continentId) VALUES ('Vietnam', 1);
INSERT INTO Country (name, continentId) VALUES ('Virgin Islands, British', 5);
INSERT INTO Country (name, continentId) VALUES ('Virgin Islands, U.S.', 5);
INSERT INTO Country (name, continentId) VALUES ('Wales', 2);
INSERT INTO Country (name, continentId) VALUES ('Wallis and Futuna', 4);
INSERT INTO Country (name, continentId) VALUES ('Western Sahara', 3);
INSERT INTO Country (name, continentId) VALUES ('Yemen', 1);
INSERT INTO Country (name, continentId) VALUES ('Yugoslavia', 2);
INSERT INTO Country (name, continentId) VALUES ('Zambia', 3);
INSERT INTO Country (name, continentId) VALUES ('Zimbabwe', 3);
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.1.1", "Non-text Content", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.1", "Audio-only and Video-only (Prerecorded)", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.2", "Captions (Prerecorded)", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.3", "Audio Description or Media Alternative (Prerecorded)", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/audio-description-or-media-alternative-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.4", "Captions (Live)", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/captions-live");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.5", "Audio Description (Prerecorded)", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/audio-description-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.6", "Sign Language (Prerecorded)", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/sign-language-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.7", "Extended Audio Description (Prerecorded)", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/extended-audio-description-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.8", "Media Alternative (Prerecorded)", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/media-alternative-prerecorded");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.2.9", "Audio-only (Live)", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/audio-only-live");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.3.1", "Info and Relationships", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.3.2", "Meaningful Sequence", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/meaningful-sequence");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.3.3", "Sensory Characteristics", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/sensory-characteristics");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.3.4", "Orientation", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/orientation");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.3.5", "Identify Input Purpose", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.3.6", "Identify Purpose", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/identify-purpose");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.1", "Use of Color", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.2", "Audio Control", "Perceivable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/audio-control");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.3", "Contrast (Minimum)", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.4", "Resize text", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/resize-text");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.5", "Images of Text", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/images-of-text");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.6", "Contrast (Enhanced)", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.7", "Low or No Background Audio", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/low-or-no-background-audio");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.8", "Visual Presentation", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.9", "Images of Text (No Exception)", "Perceivable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/images-of-text-no-exception");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.10", "Reflow", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/reflow");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.11", "Non-text Contrast", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.12", "Text Spacing", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/text-spacing");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("1.4.13", "Content on Hover or Focus", "Perceivable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.1.1", "Keyboard", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/keyboard");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.1.2", "No Keyboard Trap", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.1.3", "Keyboard (No Exception)", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/keyboard-no-exception");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.1.4", "Character Key Shortcuts", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.2.1", "Timing Adjustable", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.2.2", "Pause, Stop, Hide", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.2.3", "No Timing", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/no-timing");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.2.4", "Interruptions", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/interruptions");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.2.5", "Re-authenticating", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/re-authenticating");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.2.6", "Timeouts", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/timeouts");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.3.1", "Three Flashes or Below Threshold", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.3.2", "Three Flashes", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/three-flashes");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.3.3", "Animation from Interactions", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.1", "Bypass Blocks", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.2", "Page Titled", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/page-titled");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.3", "Focus Order", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/focus-order");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.4", "Link Purpose (In Context)", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.5", "Multiple Ways", "Operable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/multiple-ways");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.6", "Headings and Labels", "Operable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.7", "Focus Visible", "Operable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/focus-visible");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.8", "Location", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/location");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.9", "Link Purpose (Link Only)", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-link-only");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.4.10", "Section Headings", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/section-headings");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.5.1", "Pointer Gestures", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.5.2", "Pointer Cancellation", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.5.3", "Label in Name", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/label-in-name");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.5.4", "Motion Actuation", "Operable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/motion-actuation");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.5.5", "Target Size", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/target-size");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("2.5.6", "Concurrent Input Mechanisms", "Operable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/concurrent-input-mechanisms");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.1.1", "Language of Page", "Understandable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.1.2", "Language of Parts", "Understandable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.1.3", "Unusual Words", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/unusual-words");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.1.4", "Abbreviations", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/abbreviations");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.1.5", "Reading Level", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/reading-level");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.1.6", "Pronunciation", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/pronunciation");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.2.1", "On Focus", "Understandable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/on-focus");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.2.2", "On Input", "Understandable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/on-input");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.2.3", "Consistent Navigation", "Understandable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.2.4", "Consistent Identification", "Understandable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/consistent-identification");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.2.5", "Change on Request", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/change-on-request");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.3.1", "Error Identification", "Understandable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/error-identification");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.3.2", "Labels or Instructions", "Understandable", "A", "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.3.3", "Error Suggestion", "Understandable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/error-suggestion");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.3.4", "Error Prevention (Legal, Financial, Data)", "Understandable", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-legal-financial-data");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.3.5", "Help", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/help");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("3.3.6", "Error Prevention (All)", "Understandable", "AAA", "https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-all");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("4.1.1", "Parsing", "Robust", "A", "https://www.w3.org/WAI/WCAG21/Understanding/parsing");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("4.1.2", "Name, Role, Value", "Robust", "A", "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value");
INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES ("4.1.3", "Status Messages", "Robust", "AA", "https://www.w3.org/WAI/WCAG21/Understanding/status-messages");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("d0f69e", "All table header cells have assigned data cells", "https://act-rules.github.io/rules/d0f69e", "This rule checks that each table header has assigned data cells in a table element.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("1", "1.3.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("ff89c9", "ARIA required context role", "https://act-rules.github.io/rules/ff89c9", "This rule checks that an element with an explicit semantic role exists inside its required context.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("2", "1.3.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("bc4a75", "ARIA required owned elements", "https://act-rules.github.io/rules/bc4a75", "This rule checks that an element with an explicit semantic role has at least one of its required owned elements.");     
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("3", "1.3.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("6a7281", "ARIA state or property has valid value", "https://act-rules.github.io/rules/6a7281", "This rule checks that each ARIA state or property has a valid value.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("5c01ea", "ARIA state or property is permitted", "https://act-rules.github.io/rules/5c01ea", "This rule checks that WAI-ARIA states or properties are allowed for the element they are specified on.");        
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("5f99a7", "aria-* attribute is defined in WAI-ARIA", "https://act-rules.github.io/rules/5f99a7", "This rule checks that each aria- attribute specified is defined in ARIA 1.1.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("e6952f", "Attribute is not duplicated", "https://act-rules.github.io/rules/e6952f", "This rule checks that HTML and SVG starting tags do not contain duplicated attributes.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("7", "4.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("e7aa44", "audio element content has text alternative", "https://act-rules.github.io/rules/e7aa44", "This rule checks if audio only elements have a text alternative available.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("8", "1.2.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("2eb176", "audio element content has transcript", "https://act-rules.github.io/rules/2eb176", "Non-streaming audio elements must have a text alternative for all included auditory information.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("afb423", "audio element content is media alternative for text", "https://act-rules.github.io/rules/afb423", "This rule checks audio is a media alternative for text on the page.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("80f0bf", "audio or video avoids automatically playing audio", "https://act-rules.github.io/rules/80f0bf", "This rule checks that audio or video that plays automatically does not have audio that lasts for more than 3 seconds or has an audio control mechanism to stop or mute it.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("11", "1.4.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("4c31df", "audio or video that plays automatically has a control mechanism", "https://act-rules.github.io/rules/4c31df", "audio or video that plays automatically must have a control mechanism.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("aaa1bf", "audio or video that plays automatically has no audio that lasts more than 3 seconds", "https://act-rules.github.io/rules/aaa1bf", "audio or video that plays automatically does not output audio for more than 3 seconds.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("73f2c2", "autocomplete attribute has valid value", "https://act-rules.github.io/rules/73f2c2", "This rule checks that the HTML autocomplete attribute has a correct value.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("14", "1.3.5");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("97a4e1", "Button has accessible name", "https://act-rules.github.io/rules/97a4e1", "This rule checks that each button element has an accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("15", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("6cfa84", "Element with `aria-hidden` has no focusable content", "https://act-rules.github.io/rules/6cfa84", "This rule checks that elements with an aria-hidden attribute do not contain focusable elements.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("16", "1.3.1");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("16", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("de46e4", "Element with lang attribute has valid language tag", "https://act-rules.github.io/rules/de46e4", "This rule checks that a non-empty lang attribute of an element in the page body has a language tag with a known primary language subtag.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("17", "3.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("4e8ab6", "Element with role attribute has required states and properties", "https://act-rules.github.io/rules/4e8ab6", "This rule checks that elements that have an explicit role also specify all required states and properties.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("18", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("36b590", "Error message describes invalid form field value", "https://act-rules.github.io/rules/36b590", "This rule checks that text error messages provided when the user completes a form field with invalid values or using an invalid format, identify the cause of the error or how to fix the error.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("19", "3.3.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("80af7b", "Focusable element has no keyboard trap", "https://act-rules.github.io/rules/80af7b", "This rule checks for keyboard traps. This includes use of both standard and non-standard keyboard navigation to navigate through all content without becoming trapped.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("20", "2.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("ebe86a", "Focusable element has no keyboard trap via non-standard navigation", "https://act-rules.github.io/rules/ebe86a", "This rule checks if it is possible to use non-standard keyboard navigation to navigate through content where focus is trapped when using standard ways of keyboard navigation.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("a1b64e", "Focusable element has no keyboard trap via standard navigation", "https://act-rules.github.io/rules/a1b64e", "This rule checks if it is possible to use standard keyboard navigation to navigate through all content on a web page without becoming trapped in any element.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("e086e5", "Form control has non-empty accessible name", "https://act-rules.github.io/rules/e086e5", "This rule checks that each form field element has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("23", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("cc0f0a", "Form control label is descriptive", "https://act-rules.github.io/rules/cc0f0a", "This rule checks that labels describe the purpose of form field elements.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("24", "2.4.6");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("a25f45", "Headers attribute specified on a cell refers to cells in the same table element", "https://act-rules.github.io/rules/a25f45", "This rule checks that the headers attribute on a cell refer to other 
cells in the same table element.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("25", "1.3.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("ffd0e9", "Heading has non-empty accessible name", "https://act-rules.github.io/rules/ffd0e9", "This rule checks that each heading has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("26", "1.3.1");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("26", "2.4.6");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("b49b2e", "Heading is descriptive", "https://act-rules.github.io/rules/b49b2e", "This rule checks that headings describe the topic or purpose of the content.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("27", "2.4.6");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("b5c3f8", "HTML page has lang attribute", "https://act-rules.github.io/rules/b5c3f8", "This rule checks that an HTML page has a non-empty lang attribute.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("28", "3.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("2779a5", "HTML page has title", "https://act-rules.github.io/rules/2779a5", "This rule checks that the HTML page has a title.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("29", "2.4.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("5b7ae0", "HTML page lang and xml:lang attributes have matching values", "https://act-rules.github.io/rules/5b7ae0", "This rule checks that all HTML pages with both a lang and xml:lang attributes on the root element, have the same primary language subtag.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("30", "3.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("bf051a", "HTML page lang attribute has valid language tag", "https://act-rules.github.io/rules/bf051a", "This rule checks that the lang attribute of the root element of an HTML page has a language tag with 
a known primary language subtag.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("31", "3.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("c4a8a4", "HTML page title is descriptive", "https://act-rules.github.io/rules/c4a8a4", "This rule checks that the first title in an HTML page describes the topic or purpose of that page.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("32", "2.4.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("3ea0c8", "id attribute value is unique", "https://act-rules.github.io/rules/3ea0c8", "This rule checks that all id attribute values on a single page are unique.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("33", "4.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("cae760", "iframe element has non-empty accessible name", "https://act-rules.github.io/rules/cae760", "This rule checks that each iframe element has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("34", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("4b1c6c", "iframe elements with identical accessible names have equivalent purpose", "https://act-rules.github.io/rules/4b1c6c", "This rule checks that iframe elements with identical accessible names embed the same resource or equivalent resources.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("35", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("59796f", "Image button has non-empty accessible name", "https://act-rules.github.io/rules/59796f", "This rule checks that each image button element has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("36", "1.1.1");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("36", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("9eb3f6", "Image filename is accessible name for image", "https://act-rules.github.io/rules/9eb3f6", "This rule checks that image elements that use their source filename as their accessible name do so without loss of information to the user.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("37", "1.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("23a2a8", "Image has non-empty accessible name", "https://act-rules.github.io/rules/23a2a8", "This rule checks that each image either has a non-empty accessible name or is marked up as decorative");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("38", "1.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("e88epe", "Image not in the accessibility tree is decorative", "https://act-rules.github.io/rules/e88epe", "This rule checks that visible img, svg and canvas elements that are ignored by assistive technologies are decorative");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("39", "1.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("c487ae", "Link has non-empty accessible name", "https://act-rules.github.io/rules/c487ae", "This rule checks that each link has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("40", "2.4.4");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("40", "2.4.9");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("40", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("5effbb", "Link in context is descriptive", "https://act-rules.github.io/rules/5effbb", "This rule checks that the accessible name of a link together with its context describe its purpose.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("41", "2.4.4");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("41", "2.4.9");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("fd3a94", "Links with identical accessible names and context serve equivalent purpose", "https://act-rules.github.io/rules/fd3a94", "This rule checks that links with identical accessible names and context resolve to the same or equivalent resources.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("42", "2.4.4");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("b20e66", "Links with identical accessible names have equivalent purpose", "https://act-rules.github.io/rules/b20e66", "This rule checks that links with identical accessible names resolve to the same resource or equivalent resources.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("43", "2.4.9");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("bc659a", "meta element has no refresh delay", "https://act-rules.github.io/rules/bc659a", "This rule checks that the meta element is not used for delayed redirecting or refreshing.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("44", "2.1.1");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("44", "2.2.4");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("44", "3.2.5");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("b4f0c3", "meta viewport does not prevent zoom", "https://act-rules.github.io/rules/b4f0c3", "This rule checks that the meta element retains the user agent ability to zoom.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("45", "1.4.4");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("8fc3b6", "Object element has non-empty accessible name", "https://act-rules.github.io/rules/8fc3b6", "This rule checks that each object element has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("46", "1.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("b33eff", "Orientation of the page is not restricted using CSS transform property", "https://act-rules.github.io/rules/b33eff", "This rule checks that page content is not restricted to either landscape or portrait orientation using CSS transform property.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("47", "1.3.4");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("674b10", "role attribute has valid value", "https://act-rules.github.io/rules/674b10", "This rule checks that each role attribute has a valid value.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("48", "4.1.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("0ssw9k", "Scrollable element is keyboard accessible", "https://act-rules.github.io/rules/0ssw9k", "This rule checks that scrollable elements can be scrolled by keyboard");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("49", "2.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("7d6734", "svg element with explicit role has non-empty accessible name", "https://act-rules.github.io/rules/7d6734", "This rule checks that each SVG image element that is explicitly included in the accessibility tree has a non-empty accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("50", "1.1.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("afw4f7", "Text has minimum contrast", "https://act-rules.github.io/rules/afw4f7", "This rule checks that the highest possible contrast of every text character with its background meets the minimal contrast 
requirement.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("51", "1.4.3");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("51", "1.4.6");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("eac66b", "video element auditory content has accessible alternative", "https://act-rules.github.io/rules/eac66b", "This rule checks that video elements have an alternative for information conveyed through audio.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("52", "1.2.2");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("f51b46", "video element auditory content has captions", "https://act-rules.github.io/rules/f51b46", "This rule checks that captions are available for audio information in non-streaming video elements.");   
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("ab4d13", "video element content is media alternative for text", "https://act-rules.github.io/rules/ab4d13", "This rule checks non-streaming video is a media alternative for text on the page.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("c5a4ea", "video element visual content has accessible alternative", "https://act-rules.github.io/rules/c5a4ea", "This rule checks that video elements with audio have an alternative for the video content as 
audio or as text.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("55", "1.2.3");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("1ea59c", "video element visual content has audio description", "https://act-rules.github.io/rules/1ea59c", "This rule checks that non-streaming video elements have all visual information also contained in the audio.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("f196ce", "video element visual content has description track", "https://act-rules.github.io/rules/f196ce", "This rule checks that description tracks that come with non-streaming video elements are descriptive.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("1ec09b", "video element visual content has strict accessible alternative", "https://act-rules.github.io/rules/1ec09b", "This rule checks that video elements with audio have audio description.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("58", "1.2.5");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("1a02b0", "video element visual content has transcript", "https://act-rules.github.io/rules/1a02b0", "This rule checks that non-streaming video elements have all audio and visual information available in a transcript.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("59", "1.2.8");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("c3232f", "video element visual-only content has accessible alternative", "https://act-rules.github.io/rules/c3232f", "This rule checks that video elements without audio have an alternative available.");    
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("60", "1.2.1");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("d7ba54", "video element visual-only content has audio track alternative", "https://act-rules.github.io/rules/d7ba54", "Non-streaming video elements without audio must have an audio alternative.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("ac7dc6", "video element visual-only content has description track", "https://act-rules.github.io/rules/ac7dc6", "This rule checks that description tracks that come with non-streaming video elements, without audio, are descriptive.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("ee13b5", "video element visual-only content has transcript", "https://act-rules.github.io/rules/ee13b5", "Non-streaming video elements without audio must have all visual information available in a transcript.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("fd26cf", "video element visual-only content is media alternative for text", "https://act-rules.github.io/rules/fd26cf", "This rule checks non-streaming silent video is a media alternative for text on the page.");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("2ee8b8", "Visible label is part of accessible name", "https://act-rules.github.io/rules/2ee8b8", "This rule checks that interactive elements labeled through their content have their visible label as part of their accessible name.");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("65", "2.5.3");
INSERT INTO Rule (Mapping, Name, Url, Description) VALUES ("59br37", "Zoomed text node is not clipped with CSS overflow", "https://act-rules.github.io/rules/59br37", "This rule checks that text nodes are not unintentionally clipped by overflow, when a page is zoomed to 200% on 1280 by 1024 viewport;");
INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES ("66", "1.4.4");
INSERT INTO ElementType (TypeId, Name) VALUES ("1", "table");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("1", "1");
INSERT INTO ElementType (TypeId, Name) VALUES ("2", "aria");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("2", "2");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("3", "2");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("4", "2");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("5", "2");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("6", "2");
INSERT INTO ElementType (TypeId, Name) VALUES ("3", "attributes");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("7", "3");
INSERT INTO ElementType (TypeId, Name) VALUES ("4", "audio");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("8", "4");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("9", "4");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("10", "4");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("11", "4");
INSERT INTO ElementType (TypeId, Name) VALUES ("5", "video");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("11", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("12", "4");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("12", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("13", "4");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("13", "5");
INSERT INTO ElementType (TypeId, Name) VALUES ("6", "input");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("14", "6");
INSERT INTO ElementType (TypeId, Name) VALUES ("7", "button");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("15", "7");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("16", "2");
INSERT INTO ElementType (TypeId, Name) VALUES ("8", "lang");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("17", "8");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("18", "2");
INSERT INTO ElementType (TypeId, Name) VALUES ("9", "form");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("19", "9");
INSERT INTO ElementType (TypeId, Name) VALUES ("10", "other");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("20", "10");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("21", "10");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("22", "10");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("23", "9");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("24", "9");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("25", "1");
INSERT INTO ElementType (TypeId, Name) VALUES ("11", "heading");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("26", "11");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("27", "11");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("28", "8");
INSERT INTO ElementType (TypeId, Name) VALUES ("12", "title");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("29", "12");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("30", "8");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("31", "8");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("32", "12");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("33", "3");
INSERT INTO ElementType (TypeId, Name) VALUES ("13", "iframe");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("34", "13");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("35", "13");
INSERT INTO ElementType (TypeId, Name) VALUES ("14", "image");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("36", "14");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("36", "7");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("37", "14");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("38", "14");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("39", "14");
INSERT INTO ElementType (TypeId, Name) VALUES ("15", "link");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("40", "15");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("41", "15");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("42", "15");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("43", "15");
INSERT INTO ElementType (TypeId, Name) VALUES ("16", "meta");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("44", "16");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("45", "16");
INSERT INTO ElementType (TypeId, Name) VALUES ("17", "object");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("46", "17");
INSERT INTO ElementType (TypeId, Name) VALUES ("18", "css");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("47", "18");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("48", "2");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("49", "18");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("50", "14");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("51", "18");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("52", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("53", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("54", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("55", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("56", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("57", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("58", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("59", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("60", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("61", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("62", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("63", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("64", "5");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("65", "2");
INSERT INTO RuleElementType (RuleId, TypeId) VALUES ("66", "18");*/