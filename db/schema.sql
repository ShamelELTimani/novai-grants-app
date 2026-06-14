CREATE DATABASE IF NOT EXISTS novai_grants
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE novai_grants;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS grant_countries;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS grants;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE grants (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  donor VARCHAR(255) NOT NULL,
  donor_type VARCHAR(50) NOT NULL,
  sector VARCHAR(100) NOT NULL,
  min_amount_usd INT NOT NULL,
  max_amount_usd INT NOT NULL,
  duration_months INT NOT NULL,
  deadline DATE NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_grants_amounts CHECK (min_amount_usd >= 0 AND max_amount_usd >= min_amount_usd),
  CONSTRAINT chk_grants_duration CHECK (duration_months > 0),
  INDEX idx_grants_sector (sector),
  INDEX idx_grants_deadline (deadline),
  INDEX idx_grants_title (title),
  INDEX idx_grants_donor (donor),
  FULLTEXT INDEX ft_grants_title_donor (title, donor)
) ENGINE=InnoDB;

CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE grant_countries (
  grant_id VARCHAR(20) NOT NULL,
  country_id INT NOT NULL,
  PRIMARY KEY (grant_id, country_id),
  CONSTRAINT fk_grant_countries_grant
    FOREIGN KEY (grant_id) REFERENCES grants(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_grant_countries_country
    FOREIGN KEY (country_id) REFERENCES countries(id)
    ON DELETE CASCADE,
  INDEX idx_grant_countries_country (country_id)
) ENGINE=InnoDB;

CREATE TABLE applications (
  id VARCHAR(36) PRIMARY KEY,
  grant_id VARCHAR(20) NOT NULL,
  org_name VARCHAR(255) NOT NULL,
  org_email VARCHAR(320) NOT NULL,
  requested_amount_usd INT NOT NULL,
  status ENUM('submitted', 'in_review', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',             -- ENUM (could only be one of these options)
  submitted_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_applications_grant
    FOREIGN KEY (grant_id) REFERENCES grants(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_applications_amount CHECK (requested_amount_usd > 0),
  UNIQUE KEY uq_applications_grant_email (grant_id, org_email),
  INDEX idx_applications_grant (grant_id),
  INDEX idx_applications_org_email (org_email),
  INDEX idx_applications_status (status)
) ENGINE=InnoDB;
