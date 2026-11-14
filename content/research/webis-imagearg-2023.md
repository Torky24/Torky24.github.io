---
title: "Webis @ ImageArg 2023: Embedding-based Stance and Persuasiveness Classification"
kind: publication
status: published
authors: ["Islam Torky", "Simon Ruth", "Shashi Sharma", "Mohamed Salama", "Krishna Chaitanya", "Tim Gollub", "Johannes Kiesel", "Benno Stein"]
venue: "10th Workshop on Argument Mining (ArgMining @ EMNLP 2023), Singapore"
year: "2023"
summary: "Our Webis team’s submission to both ImageArg 2023 subtasks: a BERT stance classifier (F1 0.84) and a CLIP-embedding model for image persuasiveness (F1 0.56), the best result in that subtask of the competition."
tags: ["Argument mining", "Multimodal", "CLIP", "Stance classification"]
links:
  paper: "https://aclanthology.org/2023.argmining-1.16/"
source: "ACL Anthology"
order: 10
---

This is our Webis team’s entry to the ImageArg 2023 shared task on multimodal argument mining, which had two subtasks.

- **Argumentative stance classification:** a BERT model for sequence classification reached an F1 score of 0.84.
- **Image persuasiveness classification:** CLIP embeddings with a neural-network classifier reached an F1 score of 0.56, the best performance for this subtask in the competition.

The analysis shows that seemingly clear sentences (for example “I support gun control”) still trip up an otherwise competitive stance classifier, and that ignoring the tweet text when predicting image persuasiveness gives a model about as effective as the top-performing one.

## Citation

```bibtex
@inproceedings{torky-etal-2023-webis,
  title     = {Webis @ ImageArg 2023: Embedding-based Stance and Persuasiveness Classification},
  author    = {Torky, Islam and Ruth, Simon and Sharma, Shashi and Salama, Mohamed and
               Chaitanya, Krishna and Gollub, Tim and Kiesel, Johannes and Stein, Benno},
  booktitle = {Proceedings of the 10th Workshop on Argument Mining},
  year      = {2023},
  address   = {Singapore},
  publisher = {Association for Computational Linguistics},
  pages     = {157--161},
  url       = {https://aclanthology.org/2023.argmining-1.16/}
}
```
