library(tidyr)
library(dplyr)
library(magrittr)

bpe <- read.csv("C:/Users/james/Downloads/bpe21_ensemble_xy_csv/bpe21_ensemble_xy.csv",sep = ";")

bpe1 <- bpe[,c(4,5,7,8,9,10,21)]

INF <- bpe1 %>%
  filter(TYPEQU == "D232")

PEDPOD <- bpe1 %>%
  filter(TYPEQU == "D237")
  
MK <- bpe1 %>%
  filter(TYPEQU == "D233")
  
PSY <- bpe1 %>%
  filter(TYPEQU == "D243")
  
MED <- bpe1 %>%
  filter(TYPEQU == "D201")

openxlsx::write.xlsx(MED,"med/med.xlsx")

### INPI

# Charger le package jsonlite
library(jsonlite)

# Chemin vers le fichier zip
zip_path <- "C:/Users/james/Downloads/stock RNE formalité.zip"

# Nom du fichier JSON dans le ZIP
file_name <- "stock_000001.json"

# Ouvrir une connexion au fichier dans le ZIP sans le décompresser physiquement
con <- unz(zip_path, file_name)

# Lire le contenu JSON à partir de la connexion
data_json <- fromJSON(con)
flat_json <- flatten(data_json)

flat_json3 <- flat_json %>%
  filter(nchar(formality.content.exploitation.adresseEntreprise.adresse.voie)>2)

# Fermer la connexion
close(con)

# Afficher le contenu du JSON
print(data_json)

