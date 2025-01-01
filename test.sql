BEGIN;

DELETE FROM locations;

INSERT INTO locations (latitude, longitude, timestamp)
VALUES
    (37.7978157, -122.3957615, now() -interval '30 minutes'),
    (37.8012406, -122.3995595, now() -interval '25 minutes'),
    (37.8041737, -122.4022846, now() -interval '20 minutes'),
    (37.8077509, -122.4079923, now() -interval '18 minutes'),
    (37.8085646, -122.4123912, now() -interval '16 minutes'),
    (37.8079882, -122.4176912, now() -interval '14 minutes'),
    (37.8033429, -122.416511,  now() -interval '12 minutes'),
    (  37.79768, -122.4154167, now() -interval '10 minutes'),
    (37.7941879, -122.4146646, now() -interval '8 minutes'),
    (37.7953749, -122.4050087, now() -interval '6 minutes'),
    (37.7963922, -122.3968118, now() -interval '4 minutes'),
    (37.7967652, -122.3955244, now() -interval '2 minutes'),
    (37.7978157, -122.3957615, now());

COMMIT;