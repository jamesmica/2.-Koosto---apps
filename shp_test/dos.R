library(sf)
library(dplyr)
library(fs)
library(tidyr)
data <- st_read("C:/Users/james/Downloads/shp/carreaux2019.geojson")

data1 <- data[,c(1,6:7)]

# Fonction pour extraire les groupes de 5 caractères et dupliquer les lignes
process_lcog_geo <- function(lcog_geo) {
  len <- nchar(lcog_geo)
  n <- len %/% 5
  segments <- substring(lcog_geo, seq(1, len-4, 5), seq(5, len, 5))
  return(segments)
}


# Appliquer la fonction et dupliquer les données
expanded_data <- data1 %>%
  rowwise() %>%
  mutate(lcog_segments = list(process_lcog_geo(lcog_geo))) %>%
  unnest(lcog_segments) %>%
  mutate(lcog_geo = lcog_segments) %>%
  select(-lcog_segments)  # Supprimez la colonne temporaire


# Assurez-vous que les données sont toujours un objet sf
expanded_data1 <- st_sf(expanded_data)

# Créer les dossiers basés sur les nouvelles valeurs de lcog_geo
unique_vals <- unique(expanded_data1$lcog_geo)
# sapply(unique_vals, function(x) dir_create(as.character(x)))

# Sauvegarder les fichiers
for (val in unique_vals) {
  subset_data <- expanded_data1[expanded_data1$lcog_geo == val, ]
  output_filename <- paste0(val, ".geojson")
  st_write(subset_data, output_filename)
}
