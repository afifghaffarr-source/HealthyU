-- Migration: Complete food database with regions & enhanced tags
-- Created: 2026-06-25T07:42:28.585676
-- Updates: 69 food items (all remaining items without regions)

UPDATE food_items SET region = 'Jakarta', tags = '{"ayam","suwir","shredded","chicken"}'::text[] WHERE id = 'acf3c5de-b8f9-4869-aea7-43c0d0836f7b'; -- Ayam Suwir
UPDATE food_items SET region = 'Jawa Timur', tags = '{"soto","soup","chicken","kuah"}'::text[] WHERE id = '16bc4719-cfcb-4766-ae68-8c32ef237a26'; -- Soto Ayam
UPDATE food_items SET region = 'Jawa Timur', tags = '{"bakso","meatball","soup","kuah"}'::text[] WHERE id = 'b423cba9-48be-4ea3-945c-fd013465aea5'; -- Bakso
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"gado-gado","salad","vegetable"}'::text[] WHERE id = 'f0605736-8860-4476-b11d-0497fa3aec6a'; -- Gado-Gado
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"tempe","fried","protein","nabati","vegetarian"}'::text[] WHERE id = '5736b26f-a3c3-45f5-8986-aaeab1326823'; -- Tempe Goreng
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"tahu","tofu","fried","nabati","vegetarian"}'::text[] WHERE id = '83ac02ba-02fc-474d-8fe1-edbed3b9f230'; -- Tahu Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{"tempe","oseng","stir-fry","nabati","vegetarian"}'::text[] WHERE id = '6327b3f8-0c66-417c-ade7-f0c80af9ccfa'; -- Oseng Tempe
UPDATE food_items SET region = 'Jawa Barat', tags = '{"tahu","pepes","steamed","nabati","vegetarian"}'::text[] WHERE id = '5ca34476-84db-4e52-83a1-a33abd4b2f36'; -- Pepes Tahu
UPDATE food_items SET region = 'Jakarta', tags = '{"nasi","goreng","fried"}'::text[] WHERE id = 'fe26bd86-0def-49a3-a0b1-1989044377fb'; -- Nasi Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{"tahu","isi","stuffed","nabati","vegetarian"}'::text[] WHERE id = '2235955e-4cb5-4c00-897b-a90aa4c683a8'; -- Tahu Isi
UPDATE food_items SET region = 'Jakarta', tags = '{"ikan","fish","grilled","seafood","protein"}'::text[] WHERE id = '8ba07992-b323-464b-aaa2-8161dba88546'; -- Ikan Bakar
UPDATE food_items SET region = 'Jakarta', tags = '{"ikan","fish","fried","seafood","protein"}'::text[] WHERE id = 'e4353323-e550-43b0-b73e-e0c85901918b'; -- Ikan Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{"ikan","salted","seafood","protein"}'::text[] WHERE id = 'bf44ad98-7fb0-42af-a1d8-c5f0894ec860'; -- Ikan Asin
UPDATE food_items SET region = 'Jakarta', tags = '{"sate","satay","chicken"}'::text[] WHERE id = '24cd60eb-efc7-4cc1-a97f-0512ffa4ac3f'; -- Sate Ayam
UPDATE food_items SET region = 'Jakarta', tags = '{"sate","kambing","goat"}'::text[] WHERE id = '43e5fceb-bd53-452e-9800-35dfe9fe2468'; -- Sate Kambing
UPDATE food_items SET region = 'Jakarta', tags = '{"mie","noodle","chicken"}'::text[] WHERE id = '13b88c9d-9652-47e2-a5b0-560d9748d74f'; -- Mie Ayam
UPDATE food_items SET region = 'Jakarta', tags = '{"kwetiau","noodle","fried"}'::text[] WHERE id = 'bdd42893-fceb-4c85-b863-e63ffdce46ec'; -- Kwetiau Goreng
UPDATE food_items SET region = 'Jawa Barat', tags = '{"sayur","lodeh","coconut","vegetables"}'::text[] WHERE id = 'daead650-3957-4652-8f3b-ab70e6e6cca1'; -- Sayur Lodeh
UPDATE food_items SET region = 'Jawa Barat', tags = '{"sayur","sop","soup","vegetables"}'::text[] WHERE id = '2a2be650-c502-4735-9360-f08a22e8ed5d'; -- Sayur Sop
UPDATE food_items SET region = 'Jawa Barat', tags = '{"kangkung","water spinach","stir-fry"}'::text[] WHERE id = '493e29bf-6cbd-4dca-aab4-01c3e3be6f76'; -- Tumis Kangkung
UPDATE food_items SET region = 'Jawa Barat', tags = '{"capcay","vegetables","stir-fry"}'::text[] WHERE id = 'f28d6ee4-96e7-473e-a9c4-5c9ac2f05d15'; -- Capcay
UPDATE food_items SET region = 'Jawa Barat', tags = '{"bayam","spinach","soup","chicken","vegetables"}'::text[] WHERE id = '62c79aa1-bb65-4ef9-ad2a-10537e3851c5'; -- Sayur Bayam
UPDATE food_items SET region = 'Jawa Barat', tags = '{"bayam","spinach","soup","chicken","vegetables"}'::text[] WHERE id = 'fee6ae7e-1595-4efa-a214-95ca04ac4d79'; -- Sayur Bayam
UPDATE food_items SET region = 'Jawa Barat', tags = '{"buncis","green beans","stir-fry"}'::text[] WHERE id = '1cccf052-150e-49f2-b8f3-5b4783d17443'; -- Tumis Buncis
UPDATE food_items SET region = 'Jawa Barat', tags = '{"terong","eggplant","balado","spicy"}'::text[] WHERE id = '2e7aa87a-2c0f-46cc-abba-301b6f5e7b24'; -- Terong Balado
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"perkedel","fritters","potato"}'::text[] WHERE id = '69f0a5b1-c239-4fbc-972b-7e6e44b2405b'; -- Perkedel
UPDATE food_items SET region = 'Jawa Barat', tags = '{"siomay","dumpling","steamed"}'::text[] WHERE id = '4fa5c7d3-a73d-47a8-84d0-3c9c9e55f3c2'; -- Siomay
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"lumpia","spring roll"}'::text[] WHERE id = 'b841c07f-50fe-4341-85bc-d93b527d2215'; -- Lumpia
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"pangsit","wonton","fried"}'::text[] WHERE id = '76380286-2fcf-4ed4-ac1f-a80227daae6c'; -- Pangsit Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{"fuyunghai","egg","chinese"}'::text[] WHERE id = '6e8d61e1-0282-4d78-9131-def4a9bc687c'; -- Fuyunghai
UPDATE food_items SET region = 'Jakarta', tags = '{"ayam","chicken","grilled"}'::text[] WHERE id = 'abd75f01-3b90-4f6e-802c-e81ca7c2b120'; -- Ayam Bakar
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"nasi","staple","rice"}'::text[] WHERE id = '6fa5b50f-22ae-495f-b61e-527c18a84e09'; -- Nasi Putih
UPDATE food_items SET region = 'Jakarta', tags = '{"ayam","chicken","fried"}'::text[] WHERE id = 'ba754d76-fa1b-4db1-ab59-e3e3f5324788'; -- Ayam Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{}'::text[] WHERE id = 'bae5e53a-84ac-4519-a9f3-770edf11d036'; -- Semur Jengkol
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"chicken"}'::text[] WHERE id = '4f926ca3-d537-4f22-a33a-d32cfec8a8aa'; -- Bubur Ayam
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'fa26c720-0983-4899-8335-4e7597d62d66'; -- Pisang
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'feee9800-1b86-4445-8825-4e411fec3d3d'; -- Apel
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = '88df7e38-52e9-4da8-b950-66ecca4e0e10'; -- Telur Rebus
UPDATE food_items SET region = 'Jawa Barat', tags = '{"vegetables"}'::text[] WHERE id = '407a9967-3a04-4849-9236-2843aa303fef'; -- Brokoli
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'cd213660-3344-45a4-9d0c-d342212d9cd5'; -- Kopi Hitam
UPDATE food_items SET region = 'Jawa Barat', tags = '{}'::text[] WHERE id = 'a321ee54-8fcf-45a6-b43e-aedc07d1c08f'; -- Labu Siam Santan
UPDATE food_items SET region = 'Jakarta', tags = '{"fried","spicy"}'::text[] WHERE id = 'ce9cd8cf-fd07-4ef1-b9a2-dfc309375eb2'; -- Sambal Goreng Ati
UPDATE food_items SET region = 'Jakarta', tags = '{"fried"}'::text[] WHERE id = '9a161e1c-82f8-445e-9ef7-af08ac2b0c56'; -- Cumi Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{"fried"}'::text[] WHERE id = '028a44b2-410d-4e89-b0e4-331ea35e72e2'; -- Udang Goreng
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = '6b04a359-23b0-4b06-b019-7791778c1b64'; -- Es Jeruk
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'e9e61694-9a18-459f-936f-32314b150f3a'; -- Teh Tawar
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'deceb39d-bef9-425f-828d-c1fea5475fb0'; -- Kopi
UPDATE food_items SET region = 'Jakarta', tags = '{"nabati","vegetarian"}'::text[] WHERE id = '44c44960-8518-4973-9a5c-fd52fc579fdf'; -- Tempe Mendoan
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"fried"}'::text[] WHERE id = '151f1cf6-161a-41a5-b3c8-0d4b06af9a08'; -- Singkong Goreng
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'c88fbae7-25e1-4341-bf72-02bf2ae1e542'; -- Perkedel Jagung
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"spicy"}'::text[] WHERE id = 'e24556ae-ff89-4cee-9b50-e2f3ab606fb0'; -- Sambal Ijo
UPDATE food_items SET region = 'Jakarta', tags = '{}'::text[] WHERE id = '58f12185-1029-4f8c-abef-04c6ea3f80b9'; -- Gulai Tunjang
UPDATE food_items SET region = 'Jakarta', tags = '{}'::text[] WHERE id = '273945d3-5ee3-4970-8d7b-b6217b107aef'; -- Kikil
UPDATE food_items SET region = 'Jakarta', tags = '{}'::text[] WHERE id = 'e36fe3c9-9e53-43fa-bed1-09b419dd1e2a'; -- Gulai Otak
UPDATE food_items SET region = 'Jawa Barat', tags = '{}'::text[] WHERE id = 'ceeaba6c-6752-4a2c-92ef-e69dadad67c9'; -- Gulai Cubadak
UPDATE food_items SET region = 'Jakarta', tags = '{}'::text[] WHERE id = '16f74c4b-91c4-41a0-93df-77ab27adfbda'; -- Nasi Ulam
UPDATE food_items SET region = 'Jakarta', tags = '{"nabati","vegetarian"}'::text[] WHERE id = 'ad8c681e-8669-490d-a206-2cdf94ac8aba'; -- Sapo Tahu
UPDATE food_items SET region = 'Jawa Barat', tags = '{"nabati","vegetarian","kuah"}'::text[] WHERE id = '814d4760-b187-4ef5-936e-4122c5e823a0'; -- Tahu Campur
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'b707bf80-f0cf-4e85-a430-fc13b1d2dc50'; -- Risoles
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = '182ba18d-6db3-42ce-8366-224230796353'; -- Lemper
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = '9b67fdd2-048f-4ccb-bd5f-3b7d913c1a0d'; -- Ote-Ote
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = '923ce203-d2ad-47a0-a06a-3a920a0e657b'; -- Bakwan
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = 'ddbfc27a-02ca-491a-88eb-90a66a9a2d29'; -- Cireng
UPDATE food_items SET region = 'Jawa Tengah', tags = '{}'::text[] WHERE id = '7477399b-1d13-4852-8340-10bb5d1e874b'; -- Combro
UPDATE food_items SET region = 'Jawa Tengah', tags = '{"nabati","vegetarian"}'::text[] WHERE id = '3ff31f9d-c5b0-45f6-861e-f3c563098966'; -- Tahu Gejrot
UPDATE food_items SET region = 'Jakarta', tags = '{"bihun","vermicelli","fried"}'::text[] WHERE id = '4294db9d-0023-4e35-bbd0-afc6b075aee4'; -- Bihun Goreng
UPDATE food_items SET region = 'Jakarta', tags = '{"telur","egg","omelette"}'::text[] WHERE id = '959c448c-92df-4efa-b863-d4fa708ab7f0'; -- Telur Dadar
UPDATE food_items SET region = 'Jakarta', tags = '{"telur","egg","fried"}'::text[] WHERE id = 'ee02cc23-f9f4-4163-9d8f-9ff8d12f8107'; -- Telur Ceplok
UPDATE food_items SET region = 'Jakarta', tags = '{"telur","balado","spicy"}'::text[] WHERE id = '9ef49d18-6de8-440e-94ed-c83de3cb84c8'; -- Telur Balado
