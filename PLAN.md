# Deine Strecke

Es geht um die Zugstrecke. Du verlängerst sie, schickst einen Zug zur Mine, holst dort Mineralien und lieferst sie am passenden Ziel ab. Eine Fahrt dauert etwa 20–40 Sekunden, ein neues Gleisstück liegt sofort nach dem Kauf.

Jede Mine gibt ein bestimmtes Mineral. Jedes Ziel nimmt nur das passende Mineral an. Züge sind unterschiedlich selten und fassen unterschiedlich viel auf einmal:

- Gewöhnlich: 1 Einheit
- Ungewöhnlich: 2 Einheiten
- Selten: 3 Einheiten

In der ersten Version gibt es drei Minen: Kohle, Eisen, Gold. Am Start liegt nur das Gleis zur Kohlemine und ein gewöhnlicher Zug.

Technik: **Vite + Three.js** in diesem Ordner. Jede Änderung ist sofort im Browser sichtbar.

## 1. Projekt und leerer Hof

Vite-Projekt mit Three.js anlegen. Eine Szene mit Licht, flachem Gelände, einem kleinen Abstellgleis und frei drehbarer Kamera.

Fertig, wenn im Browser der leere Hof steht und du mit der Maus darum kreisen kannst.

## 2. Das erste Gleis zur Mine

Ein kurzes Gleis vom Hof zur Kohlemine. Schienen als Geometrie, die Mine am Ende klar erkennbar.

Fertig, wenn Hof, Gleis und Kohlemine als eine Strecke lesbar sind.

## 3. Ein Zug auf diesem Gleis

Der gewöhnliche Zug fährt zur Mine, hält, fährt zurück. Die ganze Fahrt dauert etwa 20 Sekunden.

Fertig, wenn du die Hin- und Rückfahrt siehst.

## 4. Kamera über die Strecke

Feste Drei-Viertel-Sicht, dazu Verschieben und Zoomen entlang des Gleises. Die Kamera reicht später mit, wenn die Strecke länger wird.

Fertig, wenn du vom Hof bis zur Mine scrollen kannst, ohne den Zug zu verlieren.

## 5. Mineral aus der Mine

An der Mine lädt der Zug Kohle, aber nur so viel, wie er gleichzeitig tragen kann. Der gewöhnliche Zug nimmt eine Einheit mit.

Fertig, wenn der Zug mit genau einer Einheit Kohle zurückfährt und eine zweite erst bei der nächsten Fahrt holen kann.

## 6. Passend abliefern

Neben dem Hof steht die Abgabestelle für Kohle. Nur Kohle zählt. Ein anderes Mineral bleibt auf dem Zug. Eine richtige Lieferung zahlt Münzen.

Fertig, wenn Kohle Münzen bringt und ein falsches Mineral liegen bleibt.

## 7. Die Strecke zur nächsten Mine

Die Münzen kaufen das nächste Gleis, diesmal zur Eisenmine, plus die Abgabestelle, die nur Eisen annimmt. Die Schienen erscheinen sofort. Dieselbe Regel gilt danach für Gold.

Fertig, wenn du nach dem Kauf sofort zur neuen Mine fahren, Eisen holen und nur an der Eisen-Abgabe abgeben kannst.

## 8. Seltenere Züge

Drei Züge mit fester Ladung: gewöhnlich 1, ungewöhnlich 2, selten 3. Der seltenere Zug wird frei, wenn die Strecke einen neuen Abschnitt erreicht. Du schickst ihn zur Mine, er nimmt so viele Einheiten mit, wie seine Seltenheit erlaubt, und fährt damit zur passenden Abgabe.

Fertig, wenn ein seltenerer Zug in einer Fahrt mehr Mineral liefert als der gewöhnliche.

## 9. Ein spielbarer Ausbau

Mehrere Minen hängen an der Strecke, die du schon gelegt hast. Du wählst, welcher Zug zu welcher Mine fährt. Richtige Lieferungen zahlen den nächsten Abschnitt. Der Abschnitt dauert wenige Minuten Spielzeit.

Fertig, wenn du siehst, wie weit die Strecke reicht und welcher Zug welche Mine bedient.

## 10. Drei Minen

Hof, wachsende Gleise, Kohle-, Eisen- und Goldmine, jeweils mit passender Abgabe, drei Züge, einfacher Schienenklang und ein Startbildschirm. Am Start gibt es nur Kohle und den gewöhnlichen Zug. Am Ende kann die Strecke bis zur Goldmine reichen, mit einem Zug, der drei Einheiten auf einmal trägt.

Fertig, wenn du von Start bis Auswertung spielst, die Strecke unterwegs länger geworden ist und jede Lieferung zum passenden Mineral gehört.
